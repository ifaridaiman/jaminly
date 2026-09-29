// Real app screenshots, captured from warranty-ui on web with mock data (DESIGN §6).
// Each has a light and a dark capture; <Screenshot> picks one by colour scheme.
import type { ImageMetadata } from 'astro';
import homeLight from '../assets/screens/light/home.png';
import homeDark from '../assets/screens/dark/home.png';
import detailLight from '../assets/screens/light/detail.png';
import detailDark from '../assets/screens/dark/detail.png';
import detailNewLight from '../assets/screens/light/detail-new.png';
import detailNewDark from '../assets/screens/dark/detail-new.png';
import addReceiptLight from '../assets/screens/light/add-receipt.png';
import addReceiptDark from '../assets/screens/dark/add-receipt.png';
import addCoverageLight from '../assets/screens/light/add-coverage.png';
import addCoverageDark from '../assets/screens/dark/add-coverage.png';
import webHomeLight from '../assets/screens/light/web-home.png';
import webHomeDark from '../assets/screens/dark/web-home.png';
import cropStatusLight from '../assets/screens/light/crop-status.png';
import cropStatusDark from '../assets/screens/dark/crop-status.png';
import cropCoverageLight from '../assets/screens/light/crop-coverage.png';
import cropCoverageDark from '../assets/screens/dark/crop-coverage.png';
import cropVaultLight from '../assets/screens/light/crop-vault.png';
import cropVaultDark from '../assets/screens/dark/crop-vault.png';

type Pair = { light: ImageMetadata; dark: ImageMetadata };

export const screens = {
  home: { light: homeLight, dark: homeDark },
  detail: { light: detailLight, dark: detailDark },
  detailNew: { light: detailNewLight, dark: detailNewDark },
  addReceipt: { light: addReceiptLight, dark: addReceiptDark },
  addCoverage: { light: addCoverageLight, dark: addCoverageDark },
  webHome: { light: webHomeLight, dark: webHomeDark },
  cropStatus: { light: cropStatusLight, dark: cropStatusDark },
  cropCoverage: { light: cropCoverageLight, dark: cropCoverageDark },
  cropVault: { light: cropVaultLight, dark: cropVaultDark },
} satisfies Record<string, Pair>;
