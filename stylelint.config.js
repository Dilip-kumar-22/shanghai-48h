/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  rules: {
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',
      { message: 'Expected a BEM class name (block__element--modifier)' },
    ],
    // Prefix syntax keeps Safari < 16.4 on the responsive rules.
    'media-feature-range-notation': 'prefix',
    // Package specifiers resolved by the bundler are not URLs.
    'import-notation': 'string',
    // Still required: -webkit-text-size-adjust (iOS Safari), -webkit-background-clip: text
    // (Chrome < 120), -webkit-backdrop-filter (Safari < 18).
    'property-no-vendor-prefix': [
      true,
      {
        ignoreProperties: ['-webkit-text-size-adjust', '-webkit-background-clip', '-webkit-backdrop-filter'],
      },
    ],
    // System colors read best in their specified case.
    'value-keyword-case': ['lower', { ignoreKeywords: ['CanvasText', 'Highlight'] }],
  },
};
