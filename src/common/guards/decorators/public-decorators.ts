import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marque une route comme publique : le guard API key ne s'applique pas.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
