import { QuotationCategory, QuotationSubcategory, QuotationProduct } from '../types';

export const INITIAL_QUOTATION_BRANDS: string[] = [
  'Hikvision',
  'Dahua',
  'CP Plus',
  'Seagate',
  'Western Digital',
  'SanDisk',
  'D-Link',
  'Secureye',
  'Trueview',
  'Matrix',
  'Finolex',
  'Prama',
  'ERD'
];

export const INITIAL_QUOTATION_CATEGORIES: QuotationCategory[] = [
  { id: 'cat-dvr', name: 'DVR Type HD / IP', createdAt: '2026-01-01' },
  { id: 'cat-nvr', name: 'NVR', createdAt: '2026-01-01' },
  { id: 'cat-hd-cam', name: 'HD Cameras', createdAt: '2026-01-01' },
  { id: 'cat-ip-cam', name: 'IP Cameras', createdAt: '2026-01-01' },
  { id: 'cat-hdd', name: 'HDD Video Storage', createdAt: '2026-01-01' },
  { id: 'cat-mem-card', name: 'Memory Card', createdAt: '2026-01-01' },
  { id: 'cat-smps', name: 'SMPS Camera Power Supply', createdAt: '2026-01-01' },
  { id: 'cat-poe', name: 'POE IP Camera Power Supply', createdAt: '2026-01-01' },
  { id: 'cat-cable', name: 'Cable – Indoor / Outdoor', createdAt: '2026-01-01' },
  { id: 'cat-pvc-box', name: 'PVC Box', createdAt: '2026-01-01' },
  { id: 'cat-stand', name: 'Stand', createdAt: '2026-01-01' },
  { id: 'cat-bnc-dc', name: 'BNC / DC / Jack', createdAt: '2026-01-01' },
];

export const INITIAL_QUOTATION_SUBCATEGORIES: QuotationSubcategory[] = [
  // 1. DVR
  { id: 'sub-dvr-hik', categoryId: 'cat-dvr', name: 'Hikvision HD DVR', createdAt: '2026-01-01' },
  { id: 'sub-dvr-dah', categoryId: 'cat-dvr', name: 'Dahua HD DVR', createdAt: '2026-01-01' },
  { id: 'sub-dvr-cpp', categoryId: 'cat-dvr', name: 'CP Plus HD DVR', createdAt: '2026-01-01' },

  // 2. NVR
  { id: 'sub-nvr-hik', categoryId: 'cat-nvr', name: 'Hikvision NVR', createdAt: '2026-01-01' },
  { id: 'sub-nvr-dah', categoryId: 'cat-nvr', name: 'Dahua NVR', createdAt: '2026-01-01' },
  { id: 'sub-nvr-cpp', categoryId: 'cat-nvr', name: 'CP Plus NVR', createdAt: '2026-01-01' },

  // 3. HD Cameras
  { id: 'sub-hdcam-2mp', categoryId: 'cat-hd-cam', name: '2MP HD Cameras', createdAt: '2026-01-01' },
  { id: 'sub-hdcam-5mp', categoryId: 'cat-hd-cam', name: '5MP HD Cameras', createdAt: '2026-01-01' },

  // 4. IP Cameras
  { id: 'sub-ipcam-2mp', categoryId: 'cat-ip-cam', name: '2MP IP Cameras', createdAt: '2026-01-01' },
  { id: 'sub-ipcam-3mp', categoryId: 'cat-ip-cam', name: '3MP IP Cameras', createdAt: '2026-01-01' },
  { id: 'sub-ipcam-4mp', categoryId: 'cat-ip-cam', name: '4MP IP Cameras', createdAt: '2026-01-01' },

  // 5. HDD
  { id: 'sub-hdd-surv', categoryId: 'cat-hdd', name: 'Surveillance Video HDD', createdAt: '2026-01-01' },

  // 6. Memory Card
  { id: 'sub-mem-micro', categoryId: 'cat-mem-card', name: 'MicroSD High Endurance', createdAt: '2026-01-01' },

  // 7. SMPS
  { id: 'sub-smps-box', categoryId: 'cat-smps', name: 'SMPS Multi-Channel Power Box', createdAt: '2026-01-01' },

  // 8. POE
  { id: 'sub-poe-100', categoryId: 'cat-poe', name: '10/100 Uplink POE Switch', createdAt: '2026-01-01' },
  { id: 'sub-poe-1000', categoryId: 'cat-poe', name: '100/1000 Gigabit Uplink POE Switch', createdAt: '2026-01-01' },

  // 9. Cable
  { id: 'sub-cable-3plus1', categoryId: 'cat-cable', name: '3+1 CCTV Copper Wire', createdAt: '2026-01-01' },
  { id: 'sub-cable-cat6', categoryId: 'cat-cable', name: 'CAT6 Network Cable', createdAt: '2026-01-01' },

  // 10. PVC Box
  { id: 'sub-pvc-box', categoryId: 'cat-pvc-box', name: 'Camera PVC Junction Boxes', createdAt: '2026-01-01' },

  // 11. Stand
  { id: 'sub-stand-powder', categoryId: 'cat-stand', name: 'Metal Powder Coated Stand', createdAt: '2026-01-01' },

  // 12. BNC / DC / Jack
  { id: 'sub-bnc-dc-conn', categoryId: 'cat-bnc-dc', name: 'Connectors & Power Jacks', createdAt: '2026-01-01' },
];

export const INITIAL_QUOTATION_PRODUCTS: QuotationProduct[] = [
  // DVR - Hikvision
  {
    id: 'prod-dvr-hik-4ch-2mp',
    categoryId: 'cat-dvr',
    subcategoryId: 'sub-dvr-hik',
    name: '4CH Hikvision 2MP HD DVR',
    brand: 'Hikvision',
    modelNumber: 'DS-7104HGHI-K1',
    description: '4 Channel 1080p Lite Mini 1U H.265 DVR',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 2850,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-dvr-hik-8ch-2mp',
    categoryId: 'cat-dvr',
    subcategoryId: 'sub-dvr-hik',
    name: '8CH Hikvision 2MP HD DVR',
    brand: 'Hikvision',
    modelNumber: 'DS-7108HGHI-K1',
    description: '8 Channel 1080p Lite H.265 DVR with Audio over Coaxial',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 4200,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-dvr-hik-16ch-2mp',
    categoryId: 'cat-dvr',
    subcategoryId: 'sub-dvr-hik',
    name: '16CH Hikvision 2MP HD DVR',
    brand: 'Hikvision',
    modelNumber: 'DS-7116HGHI-K1',
    description: '16 Channel 1080p Lite H.265 DVR with Cloud P2P',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 6800,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-dvr-hik-32ch-2mp',
    categoryId: 'cat-dvr',
    subcategoryId: 'sub-dvr-hik',
    name: '32CH Hikvision 2MP HD DVR',
    brand: 'Hikvision',
    modelNumber: 'DS-7232HQHI-K2',
    description: '32 Channel High Resolution Professional DVR',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 15500,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-dvr-hik-4ch-4k',
    categoryId: 'cat-dvr',
    subcategoryId: 'sub-dvr-hik',
    name: '4CH Hikvision 4K HD DVR',
    brand: 'Hikvision',
    modelNumber: 'iDS-7204HUHI-M1/S',
    description: '4 Channel 4K AcuSense Deep Learning DVR',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 5400,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-dvr-hik-8ch-4k',
    categoryId: 'cat-dvr',
    subcategoryId: 'sub-dvr-hik',
    name: '8CH Hikvision 4K HD DVR',
    brand: 'Hikvision',
    modelNumber: 'iDS-7208HUHI-M1/S',
    description: '8 Channel 4K AcuSense Deep Learning DVR',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 8500,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-dvr-hik-16ch-4k',
    categoryId: 'cat-dvr',
    subcategoryId: 'sub-dvr-hik',
    name: '16CH Hikvision 4K HD DVR',
    brand: 'Hikvision',
    modelNumber: 'iDS-7216HUHI-M2/S',
    description: '16 Channel 4K AcuSense High-End DVR',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 16500,
    createdAt: '2026-01-01'
  },

  // DVR - Dahua
  {
    id: 'prod-dvr-dah-4ch-2mp',
    categoryId: 'cat-dvr',
    subcategoryId: 'sub-dvr-dah',
    name: '4CH Dahua 2MP HD DVR',
    brand: 'Dahua',
    modelNumber: 'DH-XVR1B04-I',
    description: '4 Channel WizSense Penta-brid 1080N/720p DVR',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 2750,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-dvr-dah-8ch-2mp',
    categoryId: 'cat-dvr',
    subcategoryId: 'sub-dvr-dah',
    name: '8CH Dahua 2MP HD DVR',
    brand: 'Dahua',
    modelNumber: 'DH-XVR1B08-I',
    description: '8 Channel WizSense Penta-brid 1080N DVR with SMD Plus',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 4100,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-dvr-dah-16ch-2mp',
    categoryId: 'cat-dvr',
    subcategoryId: 'sub-dvr-dah',
    name: '16CH Dahua 2MP HD DVR',
    brand: 'Dahua',
    modelNumber: 'DH-XVR1B16-I',
    description: '16 Channel WizSense Penta-brid 1080N DVR',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 6600,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-dvr-dah-4ch-4k',
    categoryId: 'cat-dvr',
    subcategoryId: 'sub-dvr-dah',
    name: '4CH Dahua 4K HD DVR',
    brand: 'Dahua',
    modelNumber: 'DH-XVR5104HS-4KL-I3',
    description: '4 Channel 4K-N WizSense HD DVR',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 5200,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-dvr-dah-8ch-4k',
    categoryId: 'cat-dvr',
    subcategoryId: 'sub-dvr-dah',
    name: '8CH Dahua 4K HD DVR',
    brand: 'Dahua',
    modelNumber: 'DH-XVR5108HS-4KL-I3',
    description: '8 Channel 4K-N WizSense HD DVR',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 8300,
    createdAt: '2026-01-01'
  },

  // NVR
  {
    id: 'prod-nvr-hik-4ch',
    categoryId: 'cat-nvr',
    subcategoryId: 'sub-nvr-hik',
    name: '4CH Hikvision NVR',
    brand: 'Hikvision',
    modelNumber: 'DS-7104NI-Q1/4P',
    description: '4 Channel Mini 1U 4K NVR with 4 POE Ports',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 4800,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-nvr-hik-8ch',
    categoryId: 'cat-nvr',
    subcategoryId: 'sub-nvr-hik',
    name: '8CH Hikvision NVR',
    brand: 'Hikvision',
    modelNumber: 'DS-7608NI-Q1',
    description: '8 Channel 4K 1U NVR H.265+',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 6200,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-nvr-hik-16ch',
    categoryId: 'cat-nvr',
    subcategoryId: 'sub-nvr-hik',
    name: '16CH Hikvision NVR',
    brand: 'Hikvision',
    modelNumber: 'DS-7616NI-Q2',
    description: '16 Channel 4K 2 SATA NVR H.265+',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 9800,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-nvr-hik-32ch',
    categoryId: 'cat-nvr',
    subcategoryId: 'sub-nvr-hik',
    name: '32CH Hikvision NVR',
    brand: 'Hikvision',
    modelNumber: 'DS-7732NI-K4',
    description: '32 Channel Embedded 4K 4 SATA NVR',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 19500,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-nvr-dah-4ch',
    categoryId: 'cat-nvr',
    subcategoryId: 'sub-nvr-dah',
    name: '4CH Dahua NVR',
    brand: 'Dahua',
    modelNumber: 'NVR1104HS-S3/H',
    description: '4 Channel Compact 1U 4K Smart H.265+ NVR',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 4600,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-nvr-dah-8ch',
    categoryId: 'cat-nvr',
    subcategoryId: 'sub-nvr-dah',
    name: '8CH Dahua NVR',
    brand: 'Dahua',
    modelNumber: 'NVR2108HS-4KS2',
    description: '8 Channel 1U 4K & H.265 Lite Network Video Recorder',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 5900,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-nvr-dah-16ch',
    categoryId: 'cat-nvr',
    subcategoryId: 'sub-nvr-dah',
    name: '16CH Dahua NVR',
    brand: 'Dahua',
    modelNumber: 'NVR4216-4KS2/L',
    description: '16 Channel 1U 2HDDs 4K WizSense Network Video Recorder',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 9400,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-nvr-dah-32ch',
    categoryId: 'cat-nvr',
    subcategoryId: 'sub-nvr-dah',
    name: '32CH Dahua NVR',
    brand: 'Dahua',
    modelNumber: 'NVR5432-4KS2',
    description: '32 Channel 1.5U 4HDDs 4K Pro NVR',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 18900,
    createdAt: '2026-01-01'
  },

  // HD Cameras - 2MP
  {
    id: 'prod-hdcam-2mp-dome',
    categoryId: 'cat-hd-cam',
    subcategoryId: 'sub-hdcam-2mp',
    name: '2MP Dome Camera',
    brand: 'Hikvision',
    modelNumber: 'DS-2CE56D0T-IRPF',
    description: '2MP Indoor IR Fixed Focal Dome Camera (20m IR)',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 1150,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-hdcam-2mp-bullet',
    categoryId: 'cat-hd-cam',
    subcategoryId: 'sub-hdcam-2mp',
    name: '2MP Bullet Camera',
    brand: 'Hikvision',
    modelNumber: 'DS-2CE16D0T-IRPF',
    description: '2MP Outdoor Weatherproof IR Bullet Camera',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 1250,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-hdcam-2mp-nv-mic',
    categoryId: 'cat-hd-cam',
    subcategoryId: 'sub-hdcam-2mp',
    name: '2MP Night Vision with MIC (Dome / Bullet)',
    brand: 'Hikvision',
    modelNumber: 'DS-2CE76D0T-ITPFS',
    description: '2MP Audio Over Coaxial Built-in Mic IR Camera',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 1450,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-hdcam-2mp-hyper-mic',
    categoryId: 'cat-hd-cam',
    subcategoryId: 'sub-hdcam-2mp',
    name: '2MP Colour Hyper/Hybrid with MIC',
    brand: 'Hikvision',
    modelNumber: 'DS-2CE76D0T-EXLMFS',
    description: '2MP Smart Hybrid Light Dual IR & Warm White with Mic',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 1650,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-hdcam-2mp-full-colour-mic',
    categoryId: 'cat-hd-cam',
    subcategoryId: 'sub-hdcam-2mp',
    name: '2MP Full Colour with MIC',
    brand: 'Hikvision',
    modelNumber: 'DS-2CE70DF0T-PFS',
    description: '2MP ColorVu 24/7 Full Color with Built-in Audio Mic',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 1850,
    createdAt: '2026-01-01'
  },

  // HD Cameras - 5MP
  {
    id: 'prod-hdcam-5mp-dome',
    categoryId: 'cat-hd-cam',
    subcategoryId: 'sub-hdcam-5mp',
    name: '5MP Dome Camera',
    brand: 'Hikvision',
    modelNumber: 'DS-2CE56H0T-ITPF',
    description: '5MP Ultra HD Fixed Dome Camera',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 1750,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-hdcam-5mp-bullet',
    categoryId: 'cat-hd-cam',
    subcategoryId: 'sub-hdcam-5mp',
    name: '5MP Bullet Camera',
    brand: 'Hikvision',
    modelNumber: 'DS-2CE16H0T-ITPF',
    description: '5MP Outdoor Weatherproof Bullet Camera',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 1850,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-hdcam-5mp-3k-nv-mic',
    categoryId: 'cat-hd-cam',
    subcategoryId: 'sub-hdcam-5mp',
    name: '5MP 3K Night Vision with MIC',
    brand: 'Hikvision',
    modelNumber: 'DS-2CE76K0T-LPFS',
    description: '3K 5MP Audio Over Coax High Clarity Night Vision with Mic',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 2150,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-hdcam-5mp-3k-hyper-mic',
    categoryId: 'cat-hd-cam',
    subcategoryId: 'sub-hdcam-5mp',
    name: '5MP 3K Colour Hyper/Hybrid with MIC',
    brand: 'Hikvision',
    modelNumber: 'DS-2CE76K0T-EXLMFS',
    description: '3K 5MP Smart Hybrid Light Dual LED Color with Mic',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 2450,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-hdcam-5mp-full-colour-mic',
    categoryId: 'cat-hd-cam',
    subcategoryId: 'sub-hdcam-5mp',
    name: '5MP Full Colour with MIC',
    brand: 'Hikvision',
    modelNumber: 'DS-2CE72DF3T-FS',
    description: '5MP ColorVu 24/7 Brilliant Full Color with Audio Mic',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 2850,
    createdAt: '2026-01-01'
  },

  // IP Cameras - 2MP, 3MP, 4MP
  {
    id: 'prod-ipcam-2mp-dome-bullet',
    categoryId: 'cat-ip-cam',
    subcategoryId: 'sub-ipcam-2mp',
    name: '2MP IP Dome / Bullet Camera',
    brand: 'Hikvision',
    modelNumber: 'DS-2CD1123G0E-I',
    description: '2MP POE Network Camera 30m IR H.265',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 2400,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-ipcam-2mp-nv-mic',
    categoryId: 'cat-ip-cam',
    subcategoryId: 'sub-ipcam-2mp',
    name: '2MP IP Night Vision with MIC',
    brand: 'Hikvision',
    modelNumber: 'DS-2CD1023G2-LIUF',
    description: '2MP Smart Hybrid Light POE IP Camera with Built-in Mic',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 2900,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-ipcam-2mp-hyper-mic',
    categoryId: 'cat-ip-cam',
    subcategoryId: 'sub-ipcam-2mp',
    name: '2MP IP Colour Hyper/Hybrid with MIC',
    brand: 'Hikvision',
    modelNumber: 'DS-2CD1323G2-LIUF',
    description: '2MP Smart Hybrid Turret Network Camera with Mic',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 3200,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-ipcam-2mp-full-colour',
    categoryId: 'cat-ip-cam',
    subcategoryId: 'sub-ipcam-2mp',
    name: '2MP IP Full Colour',
    brand: 'Hikvision',
    modelNumber: 'DS-2CD1027G2-LUF',
    description: '2MP ColorVu Fixed Bullet Network Camera with Mic',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 3500,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-ipcam-3mp-hyper-mic',
    categoryId: 'cat-ip-cam',
    subcategoryId: 'sub-ipcam-3mp',
    name: '3MP IP Colour Hyper/Hybrid with MIC',
    brand: 'CP Plus',
    modelNumber: 'CP-UNC-TA31PL3-V2-0280',
    description: '3MP WDR IR Network Camera with Audio Mic & SD Card',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 3400,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-ipcam-4mp-dome-bullet',
    categoryId: 'cat-ip-cam',
    subcategoryId: 'sub-ipcam-4mp',
    name: '4MP IP Dome / Bullet Camera',
    brand: 'Hikvision',
    modelNumber: 'DS-2CD1143G0E-I',
    description: '4MP High Resolution POE IP Camera H.265+',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 3600,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-ipcam-4mp-nv-mic',
    categoryId: 'cat-ip-cam',
    subcategoryId: 'sub-ipcam-4mp',
    name: '4MP IP Night Vision with MIC',
    brand: 'Hikvision',
    modelNumber: 'DS-2CD1043G2-LIUF',
    description: '4MP Smart Hybrid Light Network Camera with Mic',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 4200,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-ipcam-4mp-hyper-mic',
    categoryId: 'cat-ip-cam',
    subcategoryId: 'sub-ipcam-4mp',
    name: '4MP IP Colour Hyper/Hybrid with MIC',
    brand: 'Hikvision',
    modelNumber: 'DS-2CD1343G2-LIUF',
    description: '4MP Smart Hybrid Turret POE Camera with Mic',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 4600,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-ipcam-4mp-full-colour',
    categoryId: 'cat-ip-cam',
    subcategoryId: 'sub-ipcam-4mp',
    name: '4MP IP Full Colour',
    brand: 'Hikvision',
    modelNumber: 'DS-2CD1047G2-LUF',
    description: '4MP ColorVu 24/7 Full Color IP Camera with Mic',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 5100,
    createdAt: '2026-01-01'
  },

  // HDD Video Storage
  {
    id: 'prod-hdd-500gb',
    categoryId: 'cat-hdd',
    subcategoryId: 'sub-hdd-surv',
    name: '500GB HDD Video Storage',
    brand: 'Seagate',
    modelNumber: 'ST500VM000',
    description: '500GB Surveillance Pipeline HD 3.5-inch Internal SATA',
    warranty: '1 Year Warranty',
    unit: 'Nos',
    latestQuotationPrice: 1650,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-hdd-1000gb',
    categoryId: 'cat-hdd',
    subcategoryId: 'sub-hdd-surv',
    name: '1000GB (1TB) HDD Video Storage',
    brand: 'Western Digital',
    modelNumber: 'WD10PURZ',
    description: '1TB WD Purple Surveillance Hard Drive SATA 64MB Cache',
    warranty: '1 Year Warranty',
    unit: 'Nos',
    latestQuotationPrice: 3600,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-hdd-1000gb-2yr',
    categoryId: 'cat-hdd',
    subcategoryId: 'sub-hdd-surv',
    name: '1000GB (1TB) HDD Video Storage (2-Year Warranty)',
    brand: 'Seagate',
    modelNumber: 'ST1000VX005 SkyHawk',
    description: '1TB Seagate SkyHawk Surveillance HDD (2 Years Warranty)',
    warranty: '2 Years Official Warranty',
    unit: 'Nos',
    latestQuotationPrice: 3950,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-hdd-2000gb-2yr',
    categoryId: 'cat-hdd',
    subcategoryId: 'sub-hdd-surv',
    name: '2000GB (2TB) HDD Video Storage (2-Year Warranty)',
    brand: 'Western Digital',
    modelNumber: 'WD22PURZ Purple',
    description: '2TB WD Purple Surveillance Hard Drive (2 Years Warranty)',
    warranty: '2 Years Official Warranty',
    unit: 'Nos',
    latestQuotationPrice: 5600,
    createdAt: '2026-01-01'
  },

  // Memory Card
  {
    id: 'prod-mem-64gb',
    categoryId: 'cat-mem-card',
    subcategoryId: 'sub-mem-micro',
    name: '64GB Surveillance Memory Card',
    brand: 'SanDisk',
    modelNumber: 'SDSQQNR-064G-GN6IA',
    description: 'SanDisk High Endurance Video Monitoring MicroSDXC 64GB',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 850,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-mem-128gb',
    categoryId: 'cat-mem-card',
    subcategoryId: 'sub-mem-micro',
    name: '128GB Surveillance Memory Card',
    brand: 'SanDisk',
    modelNumber: 'SDSQQNR-128G-GN6IA',
    description: 'SanDisk High Endurance Video Monitoring MicroSDXC 128GB',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 1450,
    createdAt: '2026-01-01'
  },

  // SMPS
  {
    id: 'prod-smps-4ch',
    categoryId: 'cat-smps',
    subcategoryId: 'sub-smps-box',
    name: '4CH SMPS Camera Power Supply',
    brand: 'ERD',
    modelNumber: 'ERD-4CH-12V',
    description: '4 Channel 12V DC CCTV Regulated SMPS Power Supply',
    warranty: '1 Year Warranty',
    unit: 'Nos',
    latestQuotationPrice: 650,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-smps-8ch',
    categoryId: 'cat-smps',
    subcategoryId: 'sub-smps-box',
    name: '8CH SMPS Camera Power Supply',
    brand: 'ERD',
    modelNumber: 'ERD-8CH-12V',
    description: '8 Channel 12V DC CCTV Regulated SMPS Power Supply',
    warranty: '1 Year Warranty',
    unit: 'Nos',
    latestQuotationPrice: 950,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-smps-16ch',
    categoryId: 'cat-smps',
    subcategoryId: 'sub-smps-box',
    name: '16CH SMPS Camera Power Supply',
    brand: 'ERD',
    modelNumber: 'ERD-16CH-12V',
    description: '16 Channel 12V DC Heavy Duty CCTV SMPS Power Supply',
    warranty: '1 Year Warranty',
    unit: 'Nos',
    latestQuotationPrice: 1650,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-smps-12v-5ah',
    categoryId: 'cat-smps',
    subcategoryId: 'sub-smps-box',
    name: '12V 5AH SMPS Power Supply',
    brand: 'ERD',
    modelNumber: '12V-5A-SMPS',
    description: '12V 5 Ampere Power Adapter for Single/DVR Setup',
    warranty: '1 Year Warranty',
    unit: 'Nos',
    latestQuotationPrice: 450,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-smps-12v-10ah',
    categoryId: 'cat-smps',
    subcategoryId: 'sub-smps-box',
    name: '12V 10AH SMPS Power Supply',
    brand: 'ERD',
    modelNumber: '12V-10A-SMPS',
    description: '12V 10 Ampere Centralized Power Supply Metal Case',
    warranty: '1 Year Warranty',
    unit: 'Nos',
    latestQuotationPrice: 850,
    createdAt: '2026-01-01'
  },

  // POE
  {
    id: 'prod-poe-4ch-100',
    categoryId: 'cat-poe',
    subcategoryId: 'sub-poe-100',
    name: '4CH 10/100 Uplink POE Switch',
    brand: 'D-Link',
    modelNumber: 'DES-F1004P-E',
    description: '4 Port 10/100M POE Switch with 2 10/100M Uplink Ports (60W)',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 1850,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-poe-8ch-100',
    categoryId: 'cat-poe',
    subcategoryId: 'sub-poe-100',
    name: '8CH 10/100 Uplink POE Switch',
    brand: 'D-Link',
    modelNumber: 'DES-F1008P-E',
    description: '8 Port 10/100M POE Switch with 2 Uplink Ports (96W)',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 2850,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-poe-16ch-100',
    categoryId: 'cat-poe',
    subcategoryId: 'sub-poe-100',
    name: '16CH 10/100 Uplink POE Switch',
    brand: 'D-Link',
    modelNumber: 'DES-F1016P-E',
    description: '16 Port 10/100M POE Switch with 2 Gigabit Combo Uplink',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 6500,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-poe-4ch-1000',
    categoryId: 'cat-poe',
    subcategoryId: 'sub-poe-1000',
    name: '4CH 100/1000 Gigabit Uplink POE Switch',
    brand: 'Hikvision',
    modelNumber: 'DS-3E0505P-E/M',
    description: '4 Port Gigabit Unmanaged POE Switch with Gigabit Uplink',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 2650,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-poe-8ch-1000',
    categoryId: 'cat-poe',
    subcategoryId: 'sub-poe-1000',
    name: '8CH 100/1000 Gigabit Uplink POE Switch',
    brand: 'Hikvision',
    modelNumber: 'DS-3E0510P-E',
    description: '8 Port Gigabit Unmanaged POE Switch with 2 SFP Uplink Ports',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 4850,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-poe-16ch-1000',
    categoryId: 'cat-poe',
    subcategoryId: 'sub-poe-1000',
    name: '16CH 100/1000 Gigabit Uplink POE Switch',
    brand: 'Hikvision',
    modelNumber: 'DS-3E1518P-EI',
    description: '16 Port Smart Managed Gigabit POE Switch',
    warranty: '2 Years Manufacturer Warranty',
    unit: 'Nos',
    latestQuotationPrice: 9800,
    createdAt: '2026-01-01'
  },

  // Cable
  {
    id: 'prod-cable-indoor-outdoor-3plus1',
    categoryId: 'cat-cable',
    subcategoryId: 'sub-cable-3plus1',
    name: 'Indoor/Outdoor 3+1 Copper Wire',
    brand: 'Finolex',
    modelNumber: '3+1-90M-CU',
    description: 'Standard 3+1 CCTV Cable 90 Meters Coil',
    warranty: 'Manufacturer Standard',
    unit: 'Nos',
    latestQuotationPrice: 1450,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-cable-cpp-3plus1',
    categoryId: 'cat-cable',
    subcategoryId: 'sub-cable-3plus1',
    name: 'CP Plus/Brand 3+1 Copper Wire',
    brand: 'CP Plus',
    modelNumber: 'CP-CAB-3+1-90M',
    description: 'CP Plus Brand 3+1 CCTV Cable 90M Roll with Molded Jacket',
    warranty: 'Manufacturer Standard',
    unit: 'Nos',
    latestQuotationPrice: 1650,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-cable-full-copper-3plus1',
    categoryId: 'cat-cable',
    subcategoryId: 'sub-cable-3plus1',
    name: '3+1 Full Copper Wire',
    brand: 'Finolex',
    modelNumber: '3+1-FULL-CU-90M',
    description: 'Heavy Grade 100% Pure Bare Solid Copper 3+1 Wire (90m)',
    warranty: 'Manufacturer Standard',
    unit: 'Nos',
    latestQuotationPrice: 1850,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-cable-cpp-full-copper-3plus1',
    categoryId: 'cat-cable',
    subcategoryId: 'sub-cable-3plus1',
    name: 'CP Plus/Brand 3+1 Full Copper Wire',
    brand: 'CP Plus',
    modelNumber: 'CP-CAB-FULL-CU-90M',
    description: 'CP Plus Pure Copper Coaxial 3+1 CCTV Cable 90M',
    warranty: 'Manufacturer Standard',
    unit: 'Nos',
    latestQuotationPrice: 2050,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-cable-cat6-copper',
    categoryId: 'cat-cable',
    subcategoryId: 'sub-cable-cat6',
    name: 'CAT6 Copper Wire',
    brand: 'D-Link',
    modelNumber: 'NCB-C6UGRYR-305',
    description: 'D-Link CAT6 UTP 4-Pair Solid Copper Cable (305m Roll)',
    warranty: 'Manufacturer Standard',
    unit: 'Nos',
    latestQuotationPrice: 6500,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-cable-cat6-full-copper',
    categoryId: 'cat-cable',
    subcategoryId: 'sub-cable-cat6',
    name: 'CAT6 Full Copper Wire',
    brand: 'Schneider',
    modelNumber: 'CAT6-HEAVY-305M',
    description: 'Heavy Gauge 23AWG 100% Bare Pure Copper CAT6 Cable (305m)',
    warranty: 'Manufacturer Standard',
    unit: 'Nos',
    latestQuotationPrice: 8200,
    createdAt: '2026-01-01'
  },

  // PVC Box
  {
    id: 'prod-pvc-2inch',
    categoryId: 'cat-pvc-box',
    subcategoryId: 'sub-pvc-box',
    name: '2-inch PVC Box',
    brand: 'Spider Grid',
    modelNumber: 'PVC-BOX-2IN',
    description: 'Standard 4x4 / 2-inch PVC Camera Junction Box',
    warranty: 'N/A',
    unit: 'Nos',
    latestQuotationPrice: 60,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-pvc-heavy',
    categoryId: 'cat-pvc-box',
    subcategoryId: 'sub-pvc-box',
    name: 'Heavy Box',
    brand: 'Spider Grid',
    modelNumber: 'PVC-BOX-HEAVY',
    description: 'Heavy Weatherproof IP66 Outdoor Seal Camera Box with Screws',
    warranty: 'N/A',
    unit: 'Nos',
    latestQuotationPrice: 95,
    createdAt: '2026-01-01'
  },

  // Stand
  {
    id: 'prod-stand-1ft',
    categoryId: 'cat-stand',
    subcategoryId: 'sub-stand-powder',
    name: '1 Feet Metal Powder Coated Stand',
    brand: 'Spider Grid',
    modelNumber: 'STD-1FT-MS',
    description: '1 Feet Heavy Duty MS Powder Coated Camera Pole Stand',
    warranty: 'N/A',
    unit: 'Nos',
    latestQuotationPrice: 180,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-stand-2ft',
    categoryId: 'cat-stand',
    subcategoryId: 'sub-stand-powder',
    name: '2 Feet Metal Powder Coated Stand',
    brand: 'Spider Grid',
    modelNumber: 'STD-2FT-MS',
    description: '2 Feet Heavy Duty MS Powder Coated Camera Wall Stand',
    warranty: 'N/A',
    unit: 'Nos',
    latestQuotationPrice: 280,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-stand-4ft',
    categoryId: 'cat-stand',
    subcategoryId: 'sub-stand-powder',
    name: '4 Feet Metal Powder Coated Stand',
    brand: 'Spider Grid',
    modelNumber: 'STD-4FT-MS',
    description: '4 Feet Heavy Duty MS Powder Coated Camera Corner/Pole Stand',
    warranty: 'N/A',
    unit: 'Nos',
    latestQuotationPrice: 480,
    createdAt: '2026-01-01'
  },

  // BNC / DC / Jack
  {
    id: 'prod-conn-bnc',
    categoryId: 'cat-bnc-dc',
    subcategoryId: 'sub-bnc-dc-conn',
    name: 'BNC',
    brand: 'Spider Grid',
    modelNumber: 'BNC-COPPER-HEAVY',
    description: 'Heavy Copper Spring BNC Video Connector',
    warranty: 'N/A',
    unit: 'Nos',
    latestQuotationPrice: 25,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-conn-dc',
    categoryId: 'cat-bnc-dc',
    subcategoryId: 'sub-bnc-dc-conn',
    name: 'DC',
    brand: 'Spider Grid',
    modelNumber: 'DC-PIN-MALE',
    description: '12V DC Power Male/Female Pin Connector with Screw Terminal',
    warranty: 'N/A',
    unit: 'Nos',
    latestQuotationPrice: 20,
    createdAt: '2026-01-01'
  },
  {
    id: 'prod-conn-jack',
    categoryId: 'cat-bnc-dc',
    subcategoryId: 'sub-bnc-dc-conn',
    name: 'Jack',
    brand: 'D-Link',
    modelNumber: 'RJ45-CAT6-GOLD',
    description: 'RJ45 Modular Gold Plated Cat6 Network Jack (Pack of 10 / Piece)',
    warranty: 'N/A',
    unit: 'Nos',
    latestQuotationPrice: 15,
    createdAt: '2026-01-01'
  },
];

export const DEFAULT_QUOTATION_TERMS = 
`1. Validity: This quotation is valid for 7 days from the date of issue.
2. Payment Terms: 50% advance along with confirmed work order, balance immediately upon completion & testing.
3. Warranty: Hardware products carry manufacturer warranty as indicated in their packaging. Warranty does not cover physical damage, burnt components, water damage, or electrical line surges.
4. Cabling & Piping: Electrical conduit pipes, extra cabling beyond initial estimate, and concealed wall cutting will be charged as per actual onsite measurement.
5. Delivery & Installation: Standard installation will commence within 2-3 working days following advance payment confirmation.
6. Support: Free onsite service support for 30 days from handover date for any configuration assistance.`;
