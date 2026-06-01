import React, { createContext, useContext, useState, useEffect } from 'react';
import { Sparkles, Check, Chrome, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Enum matches UserRole in types.ts
export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  KASIR = 'KASIR',
  DAPUR = 'DAPUR',
  CUSTOMER = 'CUSTOMER'
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  providerId: 'google.com' | 'apple.com' | 'anonymous';
  role: UserRole;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isSimulated: boolean;
  loginWithGoogle: (role?: UserRole) => Promise<AuthUser>;
  loginWithApple: (role?: UserRole) => Promise<AuthUser>;
  loginAsGuest: (name: string) => Promise<AuthUser>;
  updateUserRole: (uid: string, newRole: UserRole) => void;
  logout: () => Promise<void>;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authModalRoleRestriction: UserRole | null;
  triggerAuthWithRestriction: (roleRestriction: UserRole | null, onSuccess?: () => void) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Load initial user from localStorage for persistence in sandbox env
const STORAGE_KEY = 'qr_restaurant_auth_user2';

// Curated demo profile accounts to showcase multi-user concept beautifully
export const PRESET_PROFILES = [
  {
    name: 'Agus Pratama (Owner / Pemilik)',
    email: 'owner@restaurant.com',
    role: UserRole.OWNER,
    provider: 'google.com' as const,
    photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
  },
  {
    name: 'Lintang Syahdewo (Admin)',
    email: 'lintangsyahdewo1@gmail.com',
    role: UserRole.ADMIN,
    provider: 'google.com' as const,
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    name: 'Siti Aminah (Chef Dapur)',
    email: 'siti.aminah@apple.com',
    role: UserRole.DAPUR,
    provider: 'apple.com' as const,
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
  },
  {
    name: 'Budi Hartono (Kasir Utama)',
    email: 'budi.hartono@gmail.com',
    role: UserRole.KASIR,
    provider: 'google.com' as const,
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    name: 'John Doe (Pelanggan Setia)',
    email: 'johndoe@gmail.com',
    role: UserRole.CUSTOMER,
    provider: 'google.com' as const,
    photo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80'
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalRoleRestriction, setAuthModalRoleRestriction] = useState<UserRole | null>(null);
  const [onAuthSuccessCallback, setOnAuthSuccessCallback] = useState<(() => void) | null>(null);

  // Active simulated login screen state: null | 'google' | 'apple'
  const [activePopupType, setActivePopupType] = useState<'google' | 'apple' | null>(null);
  // Temporary fields for entering custom email/name in popup
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [targetedRole, setTargetedRole] = useState<UserRole>(UserRole.CUSTOMER);

  // Standard firebase availability check
  const isSimulated = true; // Use elegant embedded simulation for perfect presentation inside iframe preview

  useEffect(() => {
    try {
      const persistedUser = localStorage.getItem(STORAGE_KEY);
      if (persistedUser) {
        setUser(JSON.parse(persistedUser));
      }
    } catch (e) {
      console.error('Failed to load persisted user', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveUserSession = (userInfo: AuthUser | null) => {
    setUser(userInfo);
    if (userInfo) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userInfo));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const triggerAuthWithRestriction = (roleRestriction: UserRole | null, onSuccess?: () => void) => {
    setAuthModalRoleRestriction(roleRestriction);
    setOnAuthSuccessCallback(() => onSuccess || null);
    
    // Auto preset target role on restrict
    if (roleRestriction) {
      setTargetedRole(roleRestriction);
    } else {
      setTargetedRole(UserRole.CUSTOMER);
    }
    
    setShowAuthModal(true);
  };

  const loginWithGoogle = async (role: UserRole = UserRole.CUSTOMER): Promise<AuthUser> => {
    setTargetedRole(role);
    setActivePopupType('google');
    setCustomEmail('');
    setCustomName('');
    return new Promise((resolve) => {
      // Flow is controlled by popup UI actions
    });
  };

  const loginWithApple = async (role: UserRole = UserRole.CUSTOMER): Promise<AuthUser> => {
    setTargetedRole(role);
    setActivePopupType('apple');
    setCustomEmail('');
    setCustomName('');
    return new Promise((resolve) => {
      // Flow is controlled by popup UI actions
    });
  };

  const loginAsGuest = async (name: string): Promise<AuthUser> => {
    const guestUser: AuthUser = {
      uid: `guest_${Date.now()}`,
      email: `${name.toLowerCase().replace(/\s+/g, '')}@anon.com`,
      displayName: name,
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      providerId: 'anonymous',
      role: UserRole.CUSTOMER,
      createdAt: new Date().toISOString()
    };
    saveUserSession(guestUser);
    setShowAuthModal(false);
    if (onAuthSuccessCallback) {
      onAuthSuccessCallback();
      setOnAuthSuccessCallback(null);
    }
    return guestUser;
  };

  const updateUserRole = (uid: string, newRole: UserRole) => {
    if (user && user.uid === uid) {
      const updated = { ...user, role: newRole };
      saveUserSession(updated);
    }
  };

  const logout = async (): Promise<void> => {
    saveUserSession(null);
    setShowAuthModal(false);
    setOnAuthSuccessCallback(null);
  };

  // Complete a simulated account action from the custom OAuth Popups
  const handleCompletePopupLogin = (profile: {
    name: string;
    email: string;
    role: UserRole;
    provider: 'google.com' | 'apple.com';
    photo: string;
  }) => {
    const finalRole = authModalRoleRestriction ? authModalRoleRestriction : profile.role;
    const authUser: AuthUser = {
      uid: `${profile.provider}_${profile.email.replace(/[.@]/g, '_')}`,
      email: profile.email,
      displayName: profile.name,
      photoURL: profile.photo,
      providerId: profile.provider,
      role: finalRole,
      createdAt: new Date().toISOString()
    };
    saveUserSession(authUser);
    setActivePopupType(null);
    setShowAuthModal(false);
    if (onAuthSuccessCallback) {
      onAuthSuccessCallback();
      setOnAuthSuccessCallback(null);
    }
  };

  const handleCustomPopupLogin = (provider: 'google.com' | 'apple.com') => {
    if (!customEmail.trim() || !customName.trim()) return;
    
    // Choose nice random avatar
    const randomAvatarId = Math.floor(Math.random() * 70);
    const photo = `https://i.pravatar.cc/150?img=${randomAvatarId}`;
    
    const finalRole = authModalRoleRestriction ? authModalRoleRestriction : targetedRole;
    const authUser: AuthUser = {
      uid: `${provider}_${Date.now()}`,
      email: customEmail.trim(),
      displayName: customName.trim(),
      photoURL: photo,
      providerId: provider,
      role: finalRole,
      createdAt: new Date().toISOString()
    };
    
    saveUserSession(authUser);
    setActivePopupType(null);
    setShowAuthModal(false);
    if (onAuthSuccessCallback) {
      onAuthSuccessCallback();
      setOnAuthSuccessCallback(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isSimulated,
        loginWithGoogle,
        loginWithApple,
        loginAsGuest,
        updateUserRole,
        logout,
        showAuthModal,
        setShowAuthModal,
        authModalRoleRestriction,
        triggerAuthWithRestriction
      }}
    >
      {children}

      {/* STYLISH GLOBAL AUTH GATE MODAL */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                // Prevent force-closing if it's an absolute administrative gate restriction
                if (!authModalRoleRestriction) {
                  setShowAuthModal(false);
                }
              }}
              className="absolute inset-0 bg-[#050505]/95 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-md bg-dark-card border border-white/[0.08] shadow-2xl rounded-2xl p-6 overflow-hidden z-10"
            >
              {/* Decorative side accent lines colored brand */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand to-amber-500" />
              
              <div className="space-y-6">
                
                {/* Visual Header */}
                <div className="space-y-2 text-center">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-brand/10 border border-brand/25 flex items-center justify-center text-brand">
                    <Sparkles className="h-6 w-6 animate-pulse" />
                  </div>
                  
                  {authModalRoleRestriction ? (
                    <div className="space-y-1">
                      <div className="inline-flex items-center space-x-1.5 bg-rose-500/10 border border-rose-500/15 py-1 px-2.5 rounded-full text-rose-400">
                        <ShieldAlert className="h-4 w-4" />
                        <span className="text-[10px] uppercase tracking-wider font-extrabold font-mono">Restricted Access</span>
                      </div>
                      <h3 className="text-base font-black text-white">Otoritas Diperlukan</h3>
                      <p className="text-xs text-white/40 max-w-xs mx-auto">
                        Akses halaman ini memerlukan otentikasi login multi-user dengan hak akses atau peran <span className="text-brand font-bold">{authModalRoleRestriction}</span>.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-white uppercase tracking-wide">Multi-User Login Portal</h3>
                      <p className="text-xs text-white/40 max-w-xs mx-auto">
                        Masuk menggunakan akun digital Anda untuk melacak riwayat pesanan (loyalty points), atau akses dashboard kasir dsb.
                      </p>
                    </div>
                  )}
                </div>

                {/* Main Login Options Grid */}
                <div className="space-y-3 pt-2">
                  
                  {/* Google OAuth Trigger Button */}
                  <button
                    onClick={() => {
                      setTargetedRole(authModalRoleRestriction || UserRole.CUSTOMER);
                      setActivePopupType('google');
                    }}
                    className="w-full h-12 shrink-0 bg-white hover:bg-brand/10 hover:text-white border border-white/5 text-black hover:border-brand/40 font-bold text-xs rounded-xl flex items-center justify-center space-x-2.5 cursor-pointer active:scale-98 transition-all"
                  >
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.52 0-6.37-2.857-6.37-6.375s2.85-6.375 6.37-6.375c1.6 0 3.06.591 4.19 1.558l3.19-3.187C19.31 1.53 16 0 12.24 0c-6.63 0-12 5.373-12 12s5.37 12 12 12c6.96 0 11.57-4.891 11.57-11.785 0-.821-.07-1.425-.2-1.93H12.24z"/>
                    </svg>
                    <span>Masuk dengan Gmail / Google</span>
                  </button>

                  {/* Apple Id Trigger Button */}
                  <button
                    onClick={() => {
                      setTargetedRole(authModalRoleRestriction || UserRole.CUSTOMER);
                      setActivePopupType('apple');
                    }}
                    className="w-full h-12 shrink-0 bg-[#151515] hover:bg-brand/10 hover:text-white border border-white/10 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2.5 cursor-pointer active:scale-98 transition-all"
                  >
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.83-.98 2.94 1.07.08 2.15-.52 2.81-1.33z"/>
                    </svg>
                    <span>Otorisasi dengan Apple ID</span>
                  </button>

                </div>

                {/* Presets Grid to show actual multi-user logins beautifully */}
                <div className="space-y-3 pt-3 border-t border-white/[0.05]">
                  <span className="text-[10px] font-black text-white/35 uppercase tracking-wider block text-center">
                    Simulasi Akun Default (Sekali Klik)
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2.5">
                    {PRESET_PROFILES.map((profile, i) => {
                      const reqNotMatched = authModalRoleRestriction && authModalRoleRestriction !== UserRole.CUSTOMER && profile.role !== authModalRoleRestriction && profile.role !== UserRole.OWNER;
                      return (
                        <button
                          key={i}
                          disabled={!!reqNotMatched}
                          onClick={() => handleCompletePopupLogin(profile)}
                          className={`p-2.5 text-left border rounded-xl flex items-center space-x-2.5 transition-all text-xs active:scale-95 text-white bg-white/5 relative ${
                            reqNotMatched 
                              ? 'opacity-25 cursor-not-allowed border-white/5' 
                              : 'hover:bg-brand/10 hover:border-brand/35 border-white/5 cursor-pointer'
                          }`}
                        >
                          <img
                            src={profile.photo}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0"
                          />
                          <div className="truncate flex-1 min-w-0">
                            <h4 className="font-bold text-[11px] truncate leading-tight">{profile.name.split(' ')[0]}</h4>
                            <span className={`text-[8px] font-mono tracking-wider font-extrabold px-1.5 py-0.2 px-1 rounded-md uppercase mt-0.5 inline-block ${
                              profile.role === UserRole.OWNER ? 'bg-purple-500/15 text-purple-400 border border-purple-500/25' :
                              profile.role === UserRole.ADMIN ? 'bg-brand/20 text-brand' :
                              profile.role === UserRole.KASIR ? 'bg-blue-500/10 text-blue-400' :
                              profile.role === UserRole.DAPUR ? 'bg-amber-500/10 text-amber-400' :
                              'bg-white/10 text-white/70'
                            }`}>
                              {profile.role}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.05] text-[11px]">
                  {!authModalRoleRestriction ? (
                    <button
                      onClick={() => setShowAuthModal(false)}
                      className="text-white/40 hover:text-white cursor-pointer transition-colors"
                    >
                      Nanti Saja
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setShowAuthModal(false);
                      }}
                      className="text-white/40 hover:text-brand cursor-pointer font-bold"
                    >
                      Batalkan Navigasi
                    </button>
                  )}
                  
                  <span className="text-white/20 font-mono tracking-tight">Version 2.0 (Auth Multi-User)</span>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULLY FUNCTIONAL HIGH-FIDELITY BROWSER OAUTH POPUPS */}
      <AnimatePresence>
        {activePopupType && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: -15, opacity: 0 }}
              className="bg-[#0F0F12] border border-white/10 shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden"
            >
              
              {/* TOP HEADER PRESTIGE */}
              <div className="bg-[#17171C] p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`h-6 w-6 rounded-md flex items-center justify-center ${
                    activePopupType === 'google' ? 'bg-white text-black' : 'bg-black text-white'
                  }`}>
                    {activePopupType === 'google' ? (
                      <Chrome className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <path d="" /> // Apple Logo icon embedded style
                    )}
                  </div>
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none font-sans">
                    {activePopupType === 'google' ? 'Sign In with Google' : 'Sign In with Apple ID'}
                  </span>
                </div>
                
                <button
                  onClick={() => setActivePopupType(null)}
                  className="text-xs text-white/40 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* POPUP MAIN BODY CONTENT */}
              <div className="p-6 space-y-5">
                
                <div className="text-center space-y-1">
                  <h4 className="text-sm font-black text-white">Hubungkan Akun Restoran</h4>
                  <p className="text-[10px] text-white/40 font-semibold">
                    Aplikasi ini mengizinkan otentikasi login multi-user secara aman.
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-white/35 uppercase block tracking-wider">Nama Lengkap</label>
                    <input
                      type="text"
                      className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-xs text-white outline-none focus:border-brand/70 focus:bg-white/10"
                      placeholder="Masukkan nama lengkap Anda..."
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-white/35 uppercase block tracking-wider">E-mail (Digital ID)</label>
                    <input
                      type="email"
                      className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-xs text-white outline-none focus:border-brand/70 focus:bg-white/10"
                      placeholder={activePopupType === 'google' ? 'contoh@gmail.com' : 'contoh@icloud.com'}
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                    />
                  </div>

                  {!authModalRoleRestriction && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-white/35 uppercase block tracking-wider">Hak Akses / Peran Utama</label>
                      <select
                        className="w-full h-10 bg-[#121215] border border-white/10 rounded-lg px-3 text-xs text-white outline-none focus:border-brand/70"
                        value={targetedRole}
                        onChange={(e) => setTargetedRole(e.target.value as UserRole)}
                      >
                        <option value={UserRole.CUSTOMER}>Customer / Pelanggan Setia</option>
                        <option value={UserRole.OWNER}>Owner / Pemilik Resto</option>
                        <option value={UserRole.ADMIN}>Administrator Resto</option>
                        <option value={UserRole.KASIR}>Kasir Resto</option>
                        <option value={UserRole.DAPUR}>Tim Koki Dapur</option>
                      </select>
                    </div>
                  )}

                </div>

                {/* ACTIONS */}
                <div className="pt-2 flex items-center justify-end space-x-2.5">
                  <button
                    onClick={() => setActivePopupType(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs font-bold text-white/70"
                  >
                    Batal
                  </button>
                  <button
                    disabled={!customName.trim() || !customEmail.trim()}
                    onClick={() => handleCustomPopupLogin(activePopupType === 'google' ? 'google.com' : 'apple.com')}
                    className="px-5 py-2 bg-brand text-black font-black text-xs rounded-lg active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Konfirmasi Login
                  </button>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
