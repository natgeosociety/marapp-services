module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { node: '12' },
        useBuiltIns: "usage",
        corejs: 3,
      }
    ],
    [
      '@babel/preset-typescript',
      {
        onlyRemoveTypeImports: true, // important for proper files watching;
      },
    ],
  ],
  plugins: [
    "const-enum",
    "@babel/transform-typescript",
    "@babel/proposal-class-properties",
    "@babel/proposal-object-rest-spread"
  ]
};
