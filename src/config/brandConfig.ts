import brandConfig from './brand.json';

export interface BrandConfig {
  brand: {
    name: string;
    displayName: string;
    altText: string;
    domain: string;
    appUrl: string;
    docsUrl: string;
    githubUrl: string;
    githubOrg: string;
    social: {
      twitter: string;
      github: string;
    };
    api: {
      key: string;
    };
    theme: {
      name: string;
    };
  };
}

export const getBrandConfig = (): BrandConfig => {
  return brandConfig as BrandConfig;
};

export const brand = getBrandConfig().brand;