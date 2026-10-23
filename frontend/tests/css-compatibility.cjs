const assert = require('node:assert/strict');
const postcss = require('postcss');
const nested = require('postcss-nested');
const tailwind = require('tailwindcss');

(async () => {
  const content = '<div class="text-red-500 hover:text-blue-500 group-hover:block peer-checked:block [&>a]:underline -translate-x-1/2"></div>';
  const result = await postcss([
    nested(),
    tailwind({ content: [{ raw: content, extension: 'html' }], corePlugins: { preflight: false } }),
  ]).process('@tailwind utilities;.fixture { @apply text-red-500; &:hover { color: blue; } }', { from: undefined });

  const rules = new Map();
  result.root.walkRules(rule => {
    const declarations = new Map();
    rule.walkDecls(decl => declarations.set(decl.prop, decl.value));
    rules.set(rule.selector, declarations);
  });
  const value = (selector, property) => rules.get(selector)?.get(property);
  assert.match(value('.fixture', 'color'), /^rgb\(239 68 68 /);
  assert.equal(value('.fixture:hover', 'color'), 'blue');
  assert.match(value('.hover\\:text-blue-500:hover', 'color'), /^rgb\(59 130 246 /);
  assert.equal(value('.group:hover .group-hover\\:block', 'display'), 'block');
  assert.equal(value('.peer:checked ~ .peer-checked\\:block', 'display'), 'block');
  assert.equal(value('.\\[\\&\\>a\\]\\:underline>a', 'text-decoration-line'), 'underline');
  assert.equal(value('.-translate-x-1\\/2', '--tw-translate-x'), '-50%');
  console.log('PASS: patched selector parser preserves nested rules, @apply, hover/group/peer variants, arbitrary selectors and escaped fractions.');
})().catch(error => { console.error(error); process.exitCode = 1; });
