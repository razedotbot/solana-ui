import React, { useRef, useState } from 'react';
import { PlusCircle, X, Upload, RefreshCw, Info } from 'lucide-react';
import { useToast } from '../utils/useToast';
import { METEORA_DBC_CONFIGS, METEORA_CPAMM_CONFIGS, type PlatformType } from '../utils/create';

interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  twitter: string;
  telegram: string;
  website: string;
}

interface DeployFormProps {
  tokenData: TokenMetadata;
  setTokenData: React.Dispatch<React.SetStateAction<TokenMetadata>>;
  selectedPlatform: PlatformType;
  setSelectedPlatform: (platform: PlatformType) => void;
  pumpType: boolean;
  setPumpType: (type: boolean) => void;
  pumpMode: 'simple' | 'advanced';
  setPumpMode: (mode: 'simple' | 'advanced') => void;
  bonkType: 'meme' | 'tech';
  setBonkType: (type: 'meme' | 'tech') => void;
  bonkMode: 'simple' | 'advanced';
  setBonkMode: (mode: 'simple' | 'advanced') => void;
  meteoraDBCMode: 'simple' | 'advanced';
  setMeteoraDBCMode: (mode: 'simple' | 'advanced') => void;
  meteoraDBCConfigAddress: string;
  setMeteoraDBCConfigAddress: (address: string) => void;
  meteoraCPAMMConfigAddress: string;
  setMeteoraCPAMMConfigAddress: (address: string) => void;
  meteoraCPAMMInitialLiquidity: string;
  setMeteoraCPAMMInitialLiquidity: (amount: string) => void;
  meteoraCPAMMInitialTokenPercent: string;
  setMeteoraCPAMMInitialTokenPercent: (percent: string) => void;
  selectedWallets: string[];
  setSelectedWallets: React.Dispatch<React.SetStateAction<string[]>>;
  getJitoTipFromSettings: () => number;
  MAX_WALLETS_STANDARD: number;
  MAX_WALLETS_ADVANCED: number;
}

export const DeployForm: React.FC<DeployFormProps> = ({
  tokenData,
  setTokenData,
  selectedPlatform,
  setSelectedPlatform,
  pumpType,
  setPumpType,
  pumpMode,
  setPumpMode,
  bonkType,
  setBonkType,
  bonkMode,
  setBonkMode,
  meteoraDBCMode,
  setMeteoraDBCMode,
  meteoraDBCConfigAddress,
  setMeteoraDBCConfigAddress,
  meteoraCPAMMConfigAddress,
  setMeteoraCPAMMConfigAddress,
  meteoraCPAMMInitialLiquidity,
  setMeteoraCPAMMInitialLiquidity,
  meteoraCPAMMInitialTokenPercent,
  setMeteoraCPAMMInitialTokenPercent,
  selectedWallets,
  setSelectedWallets,
  getJitoTipFromSettings,
  MAX_WALLETS_STANDARD,
  MAX_WALLETS_ADVANCED,
}) => {
  const { showToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      showToast("Please select a valid image file (JPEG, PNG, GIF, SVG)", "error");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("Image file size should be less than 2MB", "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const baseUrl = 'https://public.raze.sh';
      const uploadUrl = `${baseUrl}/api/upload`;

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText) as { url: string };
          setTokenData(prev => ({ ...prev, imageUrl: response.url }));
          showToast("Image uploaded successfully", "success");
        } else {
          showToast("Failed to upload image", "error");
        }
        setIsUploading(false);
      });

      xhr.addEventListener('error', () => {
        showToast("Failed to upload image", "error");
        setIsUploading(false);
      });

      xhr.open('POST', uploadUrl);
      xhr.send(formData);

    } catch (error) {
      console.error('Error uploading image:', error);
      showToast("Failed to upload image", "error");
      setIsUploading(false);
    }
  };

  const triggerFileInput = (): void => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-6">
      {/* Token Details */}
      <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider flex items-center gap-2">
          <PlusCircle size={14} className="color-primary" />
          <span className="color-primary">&#62;</span> Token Details <span className="color-primary">&#60;</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
              <span className="color-primary">&#62;</span> Name <span className="color-primary">*</span> <span className="color-primary">&#60;</span>
            </label>
            <input
              type="text"
              value={tokenData.name}
              onChange={(e) => setTokenData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono"
              placeholder="TOKEN NAME"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
              <span className="color-primary">&#62;</span> Symbol <span className="color-primary">*</span> <span className="color-primary">&#60;</span>
            </label>
            <input
              type="text"
              value={tokenData.symbol}
              onChange={(e) => setTokenData(prev => ({ ...prev, symbol: e.target.value }))}
              className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono"
              placeholder="SYMBOL"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
              <span className="color-primary">&#62;</span> Logo <span className="color-primary">*</span> <span className="color-primary">&#60;</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/jpeg, image/png, image/gif, image/svg+xml"
              className="hidden"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={triggerFileInput}
                disabled={isUploading}
                className={`px-3 py-2.5 rounded-lg flex items-center gap-2 transition-all text-sm ${isUploading
                  ? 'bg-app-tertiary text-app-secondary cursor-not-allowed border border-app-primary-20'
                  : 'bg-app-tertiary hover:bg-app-secondary border border-app-primary-40 hover:border-app-primary text-app-primary'
                  }`}
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin color-primary" />
                    <span className="font-mono">{uploadProgress}%</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} className="color-primary" />
                    <span className="font-mono">UPLOAD</span>
                  </>
                )}
              </button>

              {tokenData.imageUrl && (
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded overflow-hidden border border-app-primary-40 bg-app-tertiary flex items-center justify-center">
                    <img
                      src={tokenData.imageUrl}
                      alt="Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setTokenData(prev => ({ ...prev, imageUrl: '' }))}
                    className="p-1 rounded-full hover:bg-app-tertiary text-app-secondary hover:text-app-primary transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
            <span className="color-primary">&#62;</span> Description <span className="color-primary">&#60;</span>
          </label>
          <textarea
            value={tokenData.description}
            onChange={(e) => setTokenData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono min-h-20"
            placeholder="DESCRIBE YOUR TOKEN"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
              <span className="color-primary">&#62;</span> Twitter <span className="color-primary">&#60;</span>
            </label>
            <input
              type="text"
              value={tokenData.twitter}
              onChange={(e) => setTokenData(prev => ({ ...prev, twitter: e.target.value }))}
              className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono"
              placeholder="https://x.com/..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
              <span className="color-primary">&#62;</span> Telegram <span className="color-primary">&#60;</span>
            </label>
            <input
              type="text"
              value={tokenData.telegram}
              onChange={(e) => setTokenData(prev => ({ ...prev, telegram: e.target.value }))}
              className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono"
              placeholder="https://t.me/..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
              <span className="color-primary">&#62;</span> Website <span className="color-primary">&#60;</span>
            </label>
            <input
              type="text"
              value={tokenData.website}
              onChange={(e) => setTokenData(prev => ({ ...prev, website: e.target.value }))}
              className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono"
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      {/* Platform Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-app-secondary flex items-center gap-1 font-mono uppercase tracking-wider">
          <span className="color-primary">&#62;</span> Platform <span className="color-primary">*</span> <span className="color-primary">&#60;</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedPlatform('pumpfun');
              const maxAllowed = pumpMode === 'advanced' ? MAX_WALLETS_ADVANCED : MAX_WALLETS_STANDARD;
              if (selectedWallets.length > maxAllowed) {
                setSelectedWallets(selectedWallets.slice(0, maxAllowed));
              }
            }}
            className={`p-4 rounded-lg border transition-all text-left ${selectedPlatform === 'pumpfun'
              ? 'border-app-primary-color bg-primary-10 shadow-lg'
              : 'border-app-primary-30 hover:border-app-primary-60'
              }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 flex-shrink-0">
                <svg width="32" height="32" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <g transform="rotate(45 256 256)">
                    <path d="M156 256V156a100 100 0 0 1 200 0v100Z" fill="#f2f7f8" />
                    <path d="M156 256v100a100 100 0 0 0 200 0V256Z" fill="#4dd994" />
                    <path d="M356 256V156a100 100 0 0 0-56-90q20 34 20 90v100Z" fill="#c1cdd2" />
                    <path d="M356 256v100a100 100 0 0 1-56 90q20-36 20-90V256Z" fill="#2a9d70" />
                    <path stroke="#163430" strokeWidth="24" strokeLinecap="round" d="M156 256h200" />
                    <rect x="156" y="56" width="200" height="400" rx="100" ry="100" fill="none" stroke="#163430" strokeWidth="24" />
                    <path d="M190 300a65 65 0 0 0 20 100" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" strokeDasharray="60 20" />
                  </g>
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-mono text-sm font-bold color-primary">PUMP.FUN</div>
                <div className="text-xs text-app-secondary mt-1">Fast deployment with bonding curve</div>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedPlatform('bonk');
              if (selectedWallets.length > MAX_WALLETS_STANDARD) {
                setSelectedWallets(selectedWallets.slice(0, MAX_WALLETS_STANDARD));
              }
            }}
            className={`p-4 rounded-lg border transition-all text-left ${selectedPlatform === 'bonk'
              ? 'border-app-primary-color bg-primary-10 shadow-lg'
              : 'border-app-primary-30 hover:border-app-primary-60'
              }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 flex-shrink-0">
                <svg width="32" height="32" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <g clipPath="url(#a)">
                    <g clipPath="url(#b)">
                      <path d="M104 162.1s-15.5 19.55-10.35 108c0 0-33.85 86.75-22.35 131.05 11.5 44.2 56.25 42 56.25 42s71.8 63.1 126.9 7.5c55.2-55.85-45.95-271.8-45.95-271.8l-12.65-74.65s-13.8 10.9-12.05 82.75c1.75 71.8-28.15 21.2-28.15 21.2z" fill="#3c2d0c" />
                      <path d="m109.75 240.3-19 53.45-6.9 37.35s-23.55 83.4 73.6 82.15c0 0 75.8 67.85 125.25 22.4l13.25-14.4 23-35.65 37.95-113.2s-12.1-77.55-88.5-109.7c0 0-6.3-3.35-17.8 1.2 0 0-31.65-71.25-51.7-62.6 0 0-17.2 9.15-2.35 79.35L169.6 192.7s-29.5-56-56.8-44.75c-25.45 10.2-3.05 92.35-3.05 92.35" fill="#e78c19" />
                      <path d="m207.9 136.35 2.35 31.05s1.75 17.8 20.65 11.5c5.4-1.75 10.05-5.5 9.6-11.6-.35-4.6-3.5-8.8-5.65-12.65-3.85-7.4-7-15.25-11.6-22.4-2.3-3.65-7.15-11.75-12.4-10.8 0 0-4-1.15-2.95 14.9M125 171c.3-.2 8-9.95 24.1 13.75 16.05 23.65 14.4 20.6 14.4 20.6s8.7 9.5-9 21.7a65 65 0 0 1-12.55 7 25 25 0 0 1-8.65 1.65c-3.4-.1-4.95-1.85-5.75-5-2.7-10.35-5.75-20.65-7.3-31.2-1.15-8.2-3.5-23.2 4.7-28.5" fill="#efb99d" />
                      <path d="M311.5 218.85c0 5.6-8.2 10.15-18.4 10.15s-18.4-4.5-18.4-10.15 8.5-14 18.5-14c10.1 0 18.3 8.35 18.3 14m-106.1 44c5.5-9.65 4.85-20.3-1.35-23.8s-15.6 1.5-21.05 11.1c-5.5 9.6-4.85 20.25 1.35 23.8 6.15 3.5 15.6-1.5 21.05-11.1m26.1 46.45 50.25-26.15s62.6-32.7 77.8-7.5 0 63.75 0 63.75-6.55 45.1-52.6 49.1l-24.75 3.4-31.65.8s-50.85 2.95-88.2-24.7l-11.85-14.4s-23.8-32.7-7.15-56.25 73.6 12.85 73.6 12.85 8 4.35 14.5-.9" fill="#fbfbfb" />
                      <path d="M345.5 179.1a12.05 12.05 0 1 0 0-24.1 12.05 12.05 0 0 0 0 24.1m-26.7-29.65a12.05 12.05 0 1 0 0-24.15 12.05 12.05 0 0 0 0 24.15M276 140a12.05 12.05 0 1 0 0-24.2 12.05 12.05 0 0 0 0 24.15m9.5-97.65c2.6 35.6-2.55 67.85-11.25 67.85-8.65 0-20.15-34.8-20.15-67.85 0-13.6 7.15-15.85 15.8-15.85 8.8 0 14.65 2.25 15.6 15.85m79.95 22.2c-13.15 33.1-31.75 60-39.5 56.2s-3-40.05 11.35-69.85c6-12.3 13.4-11.1 21.1-7.35 7.75 3.85 12.1 8.3 7 21m57.2 64.7c-28.95 21-58.95 33.65-63.5 26.25-4.55-7.35 19-35.4 47-52.85 11.6-7.15 17.2-2.2 21.8 5.05 4.45 7.4 5.75 13.5-5.3 21.55" fill="#e72d36" />
                      <path d="m229.15 274.4-3.15.35q.15.5.2 1.2c0 3.6-5.75 6.65-12.9 6.9q-.1.5 0 .95c.35 4.45 8.1 7.5 17.15 6.8s16.25-4.95 15.9-9.4c-.45-4.45-8.05-7.5-17.2-6.8m63.5-15.6-3.15.35q.15.5.2 1.15c0 3.65-5.75 6.7-12.9 6.95v.9c.35 4.5 8.1 7.5 17.15 6.8s16.25-4.9 15.9-9.35c-.35-4.5-8.05-7.5-17.2-6.8m20.85 18.5s-25.2 7.4-23.65 21.55c1.5 14.2 31.85 21.55 31.85 21.55s8.2 3.3 12.9-4.55c4.7-7.75 11.6-18.3 9.75-33.4 0 0-.6-11.25-30.85-5.15" fill="#000" />
                    </g>
                  </g>
                  <defs>
                    <clipPath id="a">
                      <path fill="#fff" d="M0 0h500v500H0z" />
                    </clipPath>
                    <clipPath id="b">
                      <path fill="#fff" d="M-50-50h600v600H-50z" />
                    </clipPath>
                  </defs>
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-mono text-sm font-bold color-primary">BONK.FUN</div>
                <div className="text-xs text-app-secondary mt-1">Advanced bot integration</div>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlatform('meteoraDBC')}
            className={`p-4 rounded-lg border transition-all text-left ${selectedPlatform === 'meteoraDBC'
              ? 'border-app-primary-color bg-primary-10 shadow-lg'
              : 'border-app-primary-30 hover:border-app-primary-60'
              }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 flex-shrink-0">
                <svg width="32" height="32" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <path d="M185.89 66.887c3.313-3.314 8.445-3.119 10.567.39 2.296 3.767 4.029 7.839 5.263 12.105.693 2.425-.109 5.261-2.122 7.275l-64.902 64.902c-3.919 3.92-8.792 6.626-13.967 7.731l-5.393 1.147c-5.154 1.126-10.07 3.834-13.968 7.732l-49.829 49.829c-2.122-8.186-3.053-13.708 3.595-20.357zm14.055 27.96c2.166-2.165 5.501-.909 5.285 1.95-1.343 17.497-9.68 35.926-24.535 50.782-11.326 12.409-43.29 31.379-66.136 44.091-4.678 2.598-8.49-2.945-4.656-6.779l90.021-90.021zm-29.864-54.204c2.057-2.058 5.089-2.49 7.168-1.061 4.331 2.945 8.381 7.211 10.46 12.365.78 1.992.108 4.44-1.602 6.15l-69.905 69.904c-3.919 3.919-8.792 6.627-13.967 7.731l-5.392 1.148c-5.154 1.126-10.07 3.833-13.968 7.73L39.76 187.726c-2.122-8.185-1.104-15.656 5.544-22.304l25.163-25.164zm-29.626-12.427c3.898-3.898 9.485-5.414 14.076-3.682a52 52 0 0 1 8.273 4.028c3.465 2.08 3.638 7.147.39 10.395l-63.927 63.927c-3.66 3.659-8.641 5.609-13.405 5.262-5.003-.368-10.265 1.69-14.141 5.566l-35.017 35.016c-2.122-8.185.628-17.389 7.277-24.038zm-10.24-6.217c3.075-.043 4.266 3.617 1.927 5.956L98.945 61.152l-27.72 27.72-7.037 7.037-10.785 10.785c-2.253 2.252-5.587.216-4.331-2.642l10.48-23.82a77 77 0 0 1 1.95-4.419l.065-.151c6.041-12.798 15.765-26.377 24.904-35.516 14.661-14.66 27.827-17.995 43.744-18.147" fill="url(#meteoraDBC-gradient)" />
                  <defs>
                    <linearGradient id="meteoraDBC-gradient" x1="236.796" y1="22.232" x2="67.909" y2="217.509" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#f5bd00" />
                      <stop offset=".365" stopColor="#f54b00" />
                      <stop offset="1" stopColor="#6e45ff" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-mono text-sm font-bold color-primary">METEORA DBC</div>
                <div className="text-xs text-app-secondary mt-1">Dynamic bonding curve</div>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlatform('meteoraCPAMM')}
            className={`p-4 rounded-lg border transition-all text-left ${selectedPlatform === 'meteoraCPAMM'
              ? 'border-app-primary-color bg-primary-10 shadow-lg'
              : 'border-app-primary-30 hover:border-app-primary-60'
              }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 flex-shrink-0">
                <svg width="32" height="32" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <path d="M185.89 66.887c3.313-3.314 8.445-3.119 10.567.39 2.296 3.767 4.029 7.839 5.263 12.105.693 2.425-.109 5.261-2.122 7.275l-64.902 64.902c-3.919 3.92-8.792 6.626-13.967 7.731l-5.393 1.147c-5.154 1.126-10.07 3.834-13.968 7.732l-49.829 49.829c-2.122-8.186-3.053-13.708 3.595-20.357zm14.055 27.96c2.166-2.165 5.501-.909 5.285 1.95-1.343 17.497-9.68 35.926-24.535 50.782-11.326 12.409-43.29 31.379-66.136 44.091-4.678 2.598-8.49-2.945-4.656-6.779l90.021-90.021zm-29.864-54.204c2.057-2.058 5.089-2.49 7.168-1.061 4.331 2.945 8.381 7.211 10.46 12.365.78 1.992.108 4.44-1.602 6.15l-69.905 69.904c-3.919 3.919-8.792 6.627-13.967 7.731l-5.392 1.148c-5.154 1.126-10.07 3.833-13.968 7.73L39.76 187.726c-2.122-8.185-1.104-15.656 5.544-22.304l25.163-25.164zm-29.626-12.427c3.898-3.898 9.485-5.414 14.076-3.682a52 52 0 0 1 8.273 4.028c3.465 2.08 3.638 7.147.39 10.395l-63.927 63.927c-3.66 3.659-8.641 5.609-13.405 5.262-5.003-.368-10.265 1.69-14.141 5.566l-35.017 35.016c-2.122-8.185.628-17.389 7.277-24.038zm-10.24-6.217c3.075-.043 4.266 3.617 1.927 5.956L98.945 61.152l-27.72 27.72-7.037 7.037-10.785 10.785c-2.253 2.252-5.587.216-4.331-2.642l10.48-23.82a77 77 0 0 1 1.95-4.419l.065-.151c6.041-12.798 15.765-26.377 24.904-35.516 14.661-14.66 27.827-17.995 43.744-18.147" fill="url(#meteoraCPAMM-gradient)" />
                  <defs>
                    <linearGradient id="meteoraCPAMM-gradient" x1="236.796" y1="22.232" x2="67.909" y2="217.509" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#00d4ff" />
                      <stop offset=".365" stopColor="#0099ff" />
                      <stop offset="1" stopColor="#0055ff" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-mono text-sm font-bold color-primary">METEORA CP-AMM</div>
                <div className="text-xs text-app-secondary mt-1">Constant product AMM</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Platform-specific options */}
      {selectedPlatform === 'pumpfun' && (
        <div className="space-y-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
              <span className="color-primary">&#62;</span> Deployment Mode <span className="color-primary">&#60;</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setPumpMode('simple');
                  if (selectedWallets.length > MAX_WALLETS_STANDARD) {
                    setSelectedWallets(selectedWallets.slice(0, MAX_WALLETS_STANDARD));
                  }
                }}
                className={`flex-1 px-4 py-3 rounded-lg font-mono tracking-wider transition-all ${pumpMode === 'simple'
                  ? 'bg-app-primary-color text-app-quaternary border border-app-primary shadow-lg'
                  : 'bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-app-primary'
                  }`}
              >
                <div className="text-sm font-bold">SIMPLE</div>
                <div className="text-xs opacity-70 mt-1">Up to 5 wallets</div>
              </button>
              <button
                type="button"
                onClick={() => setPumpMode('advanced')}
                className={`flex-1 px-4 py-3 rounded-lg font-mono tracking-wider transition-all ${pumpMode === 'advanced'
                  ? 'bg-emerald-500 text-black border border-emerald-400 shadow-lg'
                  : 'bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-emerald-500/50'
                  }`}
              >
                <div className="text-sm font-bold">ADVANCED</div>
                <div className="text-xs opacity-70 mt-1">Up to 20 wallets</div>
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div className={`border rounded-lg p-3 ${pumpMode === 'advanced'
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-app-tertiary border-app-primary-30'
            }`}>
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className={pumpMode === 'advanced' ? 'text-emerald-500' : 'color-primary'} />
              <span className={`text-xs font-mono font-bold ${pumpMode === 'advanced' ? 'text-emerald-400' : 'text-app-primary'}`}>
                {pumpMode === 'advanced' ? 'ADVANCED MODE' : 'SIMPLE MODE'}
              </span>
            </div>
            <div className="text-xs text-app-secondary font-mono">
              {pumpMode === 'advanced' ? (
                <>
                  Multi-bundle deployment. Supports up to 20 wallets.
                  Sends multiple bundles in sequence for larger deployments.
                </>
              ) : (
                <>
                  Single bundle deployment. Fast and simple for up to 5 wallets.
                </>
              )}
            </div>
          </div>

          {/* Mayhem Mode */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
              <span className="color-primary">&#62;</span> Token Type <span className="color-primary">&#60;</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPumpType(false)}
                className={`flex-1 px-4 py-2.5 rounded-lg font-mono tracking-wider transition-all ${!pumpType
                  ? 'bg-app-primary-color text-app-quaternary border border-app-primary shadow-lg'
                  : 'bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-app-primary'
                  }`}
              >
                NORMAL
              </button>
              <button
                type="button"
                onClick={() => setPumpType(true)}
                className={`flex-1 px-4 py-2.5 rounded-lg font-mono tracking-wider transition-all ${pumpType
                  ? 'bg-app-primary-color text-app-quaternary border border-app-primary shadow-lg'
                  : 'bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-app-primary'
                  }`}
              >
                MAYHEM
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPlatform === 'bonk' && (
        <div className="space-y-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
              <span className="color-primary">&#62;</span> Deployment Mode <span className="color-primary">&#60;</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setBonkMode('simple');
                  if (selectedWallets.length > MAX_WALLETS_STANDARD) {
                    setSelectedWallets(selectedWallets.slice(0, MAX_WALLETS_STANDARD));
                  }
                }}
                className={`flex-1 px-4 py-3 rounded-lg font-mono tracking-wider transition-all ${bonkMode === 'simple'
                  ? 'bg-app-primary-color text-app-quaternary border border-app-primary shadow-lg'
                  : 'bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-app-primary'
                  }`}
              >
                <div className="text-sm font-bold">SIMPLE</div>
                <div className="text-xs opacity-70 mt-1">Up to 5 wallets</div>
              </button>
              <button
                type="button"
                onClick={() => setBonkMode('advanced')}
                className={`flex-1 px-4 py-3 rounded-lg font-mono tracking-wider transition-all ${bonkMode === 'advanced'
                  ? 'bg-orange-500 text-black border border-orange-400 shadow-lg'
                  : 'bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-orange-500/50'
                  }`}
              >
                <div className="text-sm font-bold">ADVANCED</div>
                <div className="text-xs opacity-70 mt-1">Up to 20 wallets</div>
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div className={`border rounded-lg p-3 ${bonkMode === 'advanced'
            ? 'bg-orange-500/10 border-orange-500/30'
            : 'bg-app-tertiary border-app-primary-30'
            }`}>
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className={bonkMode === 'advanced' ? 'text-orange-500' : 'color-primary'} />
              <span className={`text-xs font-mono font-bold ${bonkMode === 'advanced' ? 'text-orange-400' : 'text-app-primary'}`}>
                {bonkMode === 'advanced' ? 'ADVANCED MODE' : 'SIMPLE MODE'}
              </span>
            </div>
            <div className="text-xs text-app-secondary font-mono">
              {bonkMode === 'advanced' ? (
                <>
                  Multi-bundle deployment with Lookup Tables. Supports up to 20 wallets.
                  Sends multiple bundles in sequence (LUT setup → WSOL ATAs → Buy Transactions).
                </>
              ) : (
                <>
                  Single bundle deployment. Fast and simple for up to 5 wallets.
                </>
              )}
            </div>
          </div>

          {/* Token Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
              <span className="color-primary">&#62;</span> Token Type <span className="color-primary">&#60;</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setBonkType('meme')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-mono tracking-wider transition-all ${bonkType === 'meme'
                  ? 'bg-app-primary-color text-app-quaternary border border-app-primary shadow-lg'
                  : 'bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-app-primary'
                  }`}
              >
                MEME
              </button>
              <button
                type="button"
                onClick={() => setBonkType('tech')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-mono tracking-wider transition-all ${bonkType === 'tech'
                  ? 'bg-app-primary-color text-app-quaternary border border-app-primary shadow-lg'
                  : 'bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-app-primary'
                  }`}
              >
                TECH
              </button>
            </div>
          </div>

          {/* Info about Jito Tip */}
          <div className="bg-app-tertiary border border-app-primary-30 rounded-lg p-3 flex items-center gap-2">
            <Info size={14} className="color-primary" />
            <span className="text-xs text-app-secondary font-mono">
              JITO TIP: {getJitoTipFromSettings().toFixed(4)} SOL (from Settings → Transaction Fee)
            </span>
          </div>
        </div>
      )}

      {selectedPlatform === 'meteoraDBC' && (
        <div className="space-y-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
              <span className="color-primary">&#62;</span> Deployment Mode <span className="color-primary">&#60;</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setMeteoraDBCMode('simple');
                  if (selectedWallets.length > MAX_WALLETS_STANDARD) {
                    setSelectedWallets(selectedWallets.slice(0, MAX_WALLETS_STANDARD));
                  }
                }}
                className={`flex-1 px-4 py-3 rounded-lg font-mono tracking-wider transition-all ${meteoraDBCMode === 'simple'
                  ? 'bg-app-primary-color text-app-quaternary border border-app-primary shadow-lg'
                  : 'bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-app-primary'
                  }`}
              >
                <div className="text-sm font-bold">SIMPLE</div>
                <div className="text-xs opacity-70 mt-1">Up to 5 wallets</div>
              </button>
              <button
                type="button"
                onClick={() => setMeteoraDBCMode('advanced')}
                className={`flex-1 px-4 py-3 rounded-lg font-mono tracking-wider transition-all ${meteoraDBCMode === 'advanced'
                  ? 'bg-amber-500 text-black border border-amber-400 shadow-lg'
                  : 'bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-amber-500/50'
                  }`}
              >
                <div className="text-sm font-bold">ADVANCED</div>
                <div className="text-xs opacity-70 mt-1">Up to 20 wallets</div>
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div className={`border rounded-lg p-3 ${meteoraDBCMode === 'advanced'
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-app-tertiary border-app-primary-30'
            }`}>
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className={meteoraDBCMode === 'advanced' ? 'text-amber-500' : 'color-primary'} />
              <span className={`text-xs font-mono font-bold ${meteoraDBCMode === 'advanced' ? 'text-amber-400' : 'text-app-primary'}`}>
                {meteoraDBCMode === 'advanced' ? 'ADVANCED MODE' : 'SIMPLE MODE'}
              </span>
            </div>
            <div className="text-xs text-app-secondary font-mono">
              {meteoraDBCMode === 'advanced' ? (
                <>
                  Multi-stage deployment with Lookup Tables. Supports up to 20 wallets.
                  Sends multiple bundles in sequence (LUT setup → WSOL ATAs → Deployment → Cleanup).
                </>
              ) : (
                <>
                  Single bundle deployment. Fast and simple for up to 5 wallets.
                </>
              )}
            </div>
          </div>

          {/* Config Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
              <span className="color-primary">&#62;</span> Pool Config Address <span className="color-primary">&#60;</span>
            </label>
            <input
              type="text"
              value={meteoraDBCConfigAddress}
              onChange={(e) => setMeteoraDBCConfigAddress(e.target.value)}
              className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono text-xs"
              placeholder={METEORA_DBC_CONFIGS.standard}
            />
            <div className="text-xs text-app-secondary font-mono">
              Leave default unless you have a custom pool config
            </div>
          </div>

          {/* Info about Jito Tip */}
          <div className="bg-app-tertiary border border-app-primary-30 rounded-lg p-3 flex items-center gap-2">
            <Info size={14} className="color-primary" />
            <span className="text-xs text-app-secondary font-mono">
              JITO TIP: {getJitoTipFromSettings().toFixed(4)} SOL (from Settings → Transaction Fee)
            </span>
          </div>
        </div>
      )}

      {selectedPlatform === 'meteoraCPAMM' && (
        <div className="space-y-4">
          {/* Config Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
              <span className="color-primary">&#62;</span> Pool Config Address <span className="color-primary">&#60;</span>
            </label>
            <input
              type="text"
              value={meteoraCPAMMConfigAddress}
              onChange={(e) => setMeteoraCPAMMConfigAddress(e.target.value)}
              className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono text-xs"
              placeholder={METEORA_CPAMM_CONFIGS.standard}
            />
            <div className="text-xs text-app-secondary font-mono">
              Leave default unless you have a custom pool config
            </div>
          </div>

          {/* Initial Liquidity Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                <span className="color-primary">&#62;</span> Initial Liquidity (SOL) <span className="color-primary">&#60;</span>
              </label>
              <input
                type="text"
                value={meteoraCPAMMInitialLiquidity}
                onChange={(e) => {
                  if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                    setMeteoraCPAMMInitialLiquidity(e.target.value);
                  }
                }}
                className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono"
                placeholder="1"
              />
              <div className="text-xs text-app-secondary font-mono">
                Amount of SOL for initial pool liquidity
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                <span className="color-primary">&#62;</span> Initial Token % <span className="color-primary">&#60;</span>
              </label>
              <input
                type="text"
                value={meteoraCPAMMInitialTokenPercent}
                onChange={(e) => {
                  if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                    const val = parseFloat(e.target.value);
                    if (isNaN(val) || (val >= 0 && val <= 100)) {
                      setMeteoraCPAMMInitialTokenPercent(e.target.value);
                    }
                  }
                }}
                className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono"
                placeholder="80"
              />
              <div className="text-xs text-app-secondary font-mono">
                % of token supply for pool (1-100)
              </div>
            </div>
          </div>

          {/* Info about Jito Tip */}
          <div className="bg-app-tertiary border border-app-primary-30 rounded-lg p-3 flex items-center gap-2">
            <Info size={14} className="color-primary" />
            <span className="text-xs text-app-secondary font-mono">
              JITO TIP: {getJitoTipFromSettings().toFixed(4)} SOL (from Settings → Transaction Fee)
            </span>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-blue-500" />
              <span className="text-xs font-mono font-bold text-blue-400">
                METEORA CP-AMM (DAMM v2)
              </span>
            </div>
            <div className="text-xs text-app-secondary font-mono">
              Constant Product AMM with dynamic fees. Supports up to 20 wallets.
              Creates liquidity pool with configurable initial liquidity and token allocation.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeployForm;
