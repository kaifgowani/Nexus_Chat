'use client';

import { useState } from 'react';
import { User as FirebaseAuthUser, updateProfile, updatePassword, multiFactor, TotpMultiFactorGenerator, TotpSecret } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Settings, X, Camera, Shield, Lock } from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import type { UserProfile, ShowToast } from '@/lib/types';

interface Props {
  user: FirebaseAuthUser;
  currentUserProfile: UserProfile;
  showToast: ShowToast;
  onClose: () => void;
}

export default function SettingsModal({ user, currentUserProfile, showToast, onClose }: Props) {
  const [newName, setNewName] = useState(currentUserProfile.name || '');
  const [newStatus, setNewStatus] = useState(currentUserProfile.statusText || '');
  const [newPassword, setNewPassword] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isEnrollingMFA, setIsEnrollingMFA] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Error', 'Image must be under 2MB', 'error'); return; }
    setUploadingImage(true);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      await updateProfile(user, { photoURL });
      await setDoc(doc(db, 'users', user.uid), { photoURL }, { merge: true });
      showToast('Success', 'Profile picture updated', 'success');
    } catch { showToast('Upload Failed', 'Check if Firebase Storage is enabled.', 'error'); }
    finally { setUploadingImage(false); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(user, { displayName: newName });
      await setDoc(doc(db, 'users', user.uid), { name: newName, statusText: newStatus.substring(0, 50) }, { merge: true });
      showToast('Success', 'Profile updated successfully.', 'success');
    } catch (err: any) { showToast('Error', err.message, 'error'); }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePassword(user, newPassword);
      setNewPassword('');
      showToast('Success', 'Password updated successfully.', 'success');
    } catch { showToast('Security Error', 'You must re-authenticate to change your password.', 'error'); }
  };

  const initiateMFAEnrollment = async () => {
    try {
      const session = await multiFactor(user).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(session);
      const appName = 'Nexus Connect';
      const account = user.email || user.displayName || 'User';
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(account)}?secret=${secret.secretKey}&issuer=${encodeURIComponent(appName)}`);
      setTotpSecret(secret);
      setIsEnrollingMFA(true);
    } catch (err: any) { showToast('MFA Error', err.message, 'error'); }
  };

  const verifyAndEnrollMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpSecret) return;
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, verificationCode);
      await multiFactor(user).enroll(assertion, 'Authenticator App');
      await setDoc(doc(db, 'users', user.uid), { mfaEnabled: true }, { merge: true });
      setIsEnrollingMFA(false);
      showToast('Security Upgraded', 'Two-Factor Authentication is now enabled.', 'success');
    } catch { showToast('Invalid Code', 'The code you entered is incorrect.', 'error'); }
  };

  const unenrollMFA = async () => {
    try {
      const factors = multiFactor(user).enrolledFactors;
      if (factors.length > 0) {
        await multiFactor(user).unenroll(factors[0]);
        await setDoc(doc(db, 'users', user.uid), { mfaEnabled: false }, { merge: true });
        showToast('MFA Disabled', 'Your account is now less secure.', 'info');
      }
    } catch { showToast('Error', 'Requires recent login to disable MFA.', 'error'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Settings className="text-indigo-400" /> Settings & Profile</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[65vh] overflow-y-auto custom-scrollbar">

          {/* Left: Edit Profile */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Edit Profile</h3>
            <div className="mb-6 flex items-center gap-4">
              <div className="relative h-20 w-20 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                <img src={currentUserProfile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserProfile.name}`} alt="Avatar" className="h-full w-full object-cover" />
                <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
              </div>
              <div>
                <p className="text-sm text-white font-medium">@{currentUserProfile.handle}</p>
                <p className="text-xs text-slate-400">{uploadingImage ? 'Uploading...' : 'Click image to change avatar'}</p>
              </div>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Display Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-2 focus:ring-1 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Status Message</label>
                <input value={newStatus} onChange={e => setNewStatus(e.target.value)} maxLength={50} placeholder="What's on your mind?" className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-2 focus:ring-1 focus:ring-indigo-500 outline-none" />
              </div>
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">Save Profile</button>
            </form>
          </div>

          {/* Right: Security */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Account Security</h3>
            <form onSubmit={handleUpdatePassword} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-slate-400 mb-1">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-2 focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="••••••••" />
              </div>
              <button type="submit" disabled={!newPassword} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 transition-colors">Change Password</button>
            </form>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-white flex items-center gap-2">
                  <Shield className={`h-4 w-4 ${currentUserProfile.mfaEnabled ? 'text-green-400' : 'text-slate-500'}`} /> Authenticator App
                </span>
                <span className={`text-xs px-2 py-1 rounded ${currentUserProfile.mfaEnabled ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-300'}`}>
                  {currentUserProfile.mfaEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              {isEnrollingMFA ? (
                <form onSubmit={verifyAndEnrollMFA} className="mt-4 border-t border-slate-800 pt-4">
                  <p className="text-xs text-slate-400 mb-3 text-center">Scan this QR code with Google Authenticator or Authy.</p>
                  <div className="flex justify-center mb-4 bg-white p-2 rounded-lg w-max mx-auto">
                    <img src={qrCodeUrl} alt="MFA QR Code" className="h-32 w-32" />
                  </div>
                  <input type="text" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} placeholder="6-digit code" maxLength={6}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 text-center tracking-[0.25em] focus:ring-1 focus:ring-indigo-500 outline-none mb-3" />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsEnrollingMFA(false)} className="flex-1 bg-slate-800 text-white text-xs py-2 rounded">Cancel</button>
                    <button type="submit" disabled={verificationCode.length < 6} className="flex-1 bg-indigo-600 text-white text-xs py-2 rounded disabled:opacity-50">Verify</button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="text-xs text-slate-500 mb-3">Protect your account with a secondary verification code.</p>
                  {currentUserProfile.mfaEnabled
                    ? <button onClick={unenrollMFA} className="text-xs bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded hover:bg-rose-500/30">Disable MFA</button>
                    : <button onClick={initiateMFAEnrollment} className="text-xs bg-indigo-600/20 text-indigo-400 px-3 py-1.5 rounded hover:bg-indigo-600/30">Setup MFA</button>
                  }
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}