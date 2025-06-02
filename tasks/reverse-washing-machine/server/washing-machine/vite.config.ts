import { defineConfig, createFilter } from 'vite';
import { viteSingleFile } from "vite-plugin-singlefile";
import { parse } from 'acorn';
import * as walk from 'acorn-walk';
import MagicString from 'magic-string';
import type { Plugin } from 'vite';
import vitePluginBundleObfuscator from 'vite-plugin-bundle-obfuscator';


const filter = createFilter(
  ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
  ['**/*.html', '**/*.htm']
);


function stripWgslComments(): Plugin {
  return {
    name: 'strip-wgsl-comments',
    apply: 'build',
    enforce: 'post',

    transform(code, id) {
      if (!filter(id)) return null;

      const ms = new MagicString(code);
      let changed = false;

      let ast = parse(code, {
        ecmaVersion: 'latest',
        sourceType: 'module',
      });

      walk.simple(ast, {
        TaggedTemplateExpression(node: any) {
          if (node.tag.type !== 'Identifier' || node.tag.name !== 'wgsl') return;

          node.quasi.quasis.forEach((q: any) => {
            const raw = q.value.raw;
            const cleaned = raw
              .split('\n')
              .filter(line => !line.trimStart().startsWith('//'))
              .join('\n');
            if (cleaned === raw) return;

            const escaped = cleaned.replace(/(`|\$\{)/g, '\\$1');
            ms.overwrite(q.start, q.end, escaped);
            changed = true;
          });
        },
      });

      if (!changed) return null;
      return { code: ms.toString(), map: ms.generateMap({ hires: true }) };
    },
  };
}

export default defineConfig({
  assetsInclude: ['**/*.glb'],
  plugins: [
    stripWgslComments(),
    viteSingleFile({ removeViteModuleLoader: true }),
    vitePluginBundleObfuscator({
      options:{
        compact: true,
        controlFlowFlattening: false,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: false,
        deadCodeInjectionThreshold: 0.4,
        debugProtection: false,
        debugProtectionInterval: 0,
        disableConsoleOutput: false,
        domainLock: [],
        domainLockRedirectUrl: 'about:blank',
        forceTransformStrings: [],
        identifierNamesCache: null,
        identifierNamesGenerator: 'hexadecimal',
        identifiersDictionary: [],
        identifiersPrefix: '',
        ignoreImports: false,
        inputFileName: '',
        log: false,
        numbersToExpressions: false,
        optionsPreset: 'default',
        renameGlobals: false,
        renameProperties: false,
        renamePropertiesMode: 'safe',
        reservedNames: [],
        reservedStrings: [],
        seed: 0,
        selfDefending: false,
        simplify: true,
        sourceMap: false,
        sourceMapBaseUrl: '',
        sourceMapFileName: '',
        sourceMapMode: 'separate',
        sourceMapSourcesMode: 'sources-content',
        splitStrings: false,
        splitStringsChunkLength: 10,
        stringArray: false,
        stringArrayCallsTransform: false,
        stringArrayCallsTransformThreshold: 0.5,
        stringArrayEncoding: [],
        stringArrayIndexesType: [
            'hexadecimal-number'
        ],
        stringArrayIndexShift: false,
        stringArrayRotate: false,
        stringArrayShuffle: false,
        stringArrayWrappersCount: 1,
        stringArrayWrappersChainedCalls: false,
        stringArrayWrappersParametersMaxCount: 2,
        stringArrayWrappersType: 'variable',
        stringArrayThreshold: 0.75,
        target: 'browser',
        transformObjectKeys: false,
        unicodeEscapeSequence: false
      }
    }),
  ],
  build: {
    target: 'esnext'
  }
});