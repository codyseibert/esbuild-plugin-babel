import babel from '@babel/core';
import fs from 'fs';
import path from 'path';

const pluginBabel = (options = {}) => ({
	name: 'babel',
	setup(build, { transform } = {}) {
		const cache = new Map();
		const { filter = /.*/, namespace = '', config = {} } = options;

		const transformContents = ({ args, contents }) => {
			const babelOptions = babel.loadOptions({
				...config,
				filename: args.path,
				caller: {
					name: 'esbuild-plugin-babel',
					supportsStaticESM: true
				}
			});
			if (!babelOptions) return { contents };

			if (babelOptions.sourceMaps) {
				const filename = path.relative(process.cwd(), args.path);

				babelOptions.sourceFileName = filename;
			}

			return new Promise((resolve, reject) => {
				babel.transform(contents, babelOptions, (error, result) => {
					error ? reject(error) : resolve({ contents: result.code });
				});
			});
		};

		if (transform) return transformContents(transform);

		build.onLoad({ filter, namespace }, async args => {
			const key = args.path
			let value = cache.get(key)
			const input = await fs.promises.readFile(args.path, 'utf8');

			if (!value || value.input !== input) {
				let contents = transformContents({ args, contents: input });
				value = { input, output: contents }
				cache.set(key, value)
			}

			return value.output
		});
	}
});

export default pluginBabel;
