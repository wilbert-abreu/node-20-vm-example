import { createRequire } from 'node:module';
import vm from 'node:vm';
import { NodeVM, makeResolverFromLegacyOptions, VMScript } from 'vm2';

const require = createRequire(import.meta.url);

// import ivm from 'isolated-vm';
import http from 'node:http';
import Database from 'better-sqlite3';
import url from 'node:url';

// const code = `
// ((require) => {
//   const http = require('node:http');

//   http.createServer((request, response) => {
//     response.writeHead(200, { 'Content-Type': 'text/plain' });
//     response.end('Hello World\\n');
//   }).listen(8124);

//   console.log('Server running at http://127.0.0.1:8124/');
// })`;

// vm.runInThisContext(code)(require);

// const encoder = new TextEncoder();
// const uint8array = encoder.encode('this is some data');
// console.log({ uint8array });

// const src = 'this is some data';
// const dest = new Uint8Array(10);
// const { read, written } = encoder.encodeInto(src, dest);

// console.log({ read, written });

// const myURL = new URL(
// 	'https://user:pass@sub.example.com:8080/p/a/t/h?query=string#hash',
// );

// myURL.searchParams.append('abc', 'xyz');
// myURL.searchParams.delete('abc');
// myURL.searchParams.set('a', 'b');

// console.log({ myURL, searchParams: myURL.searchParams.toString() });

// const newSearchParams = new URLSearchParams(myURL.searchParams);
// console.log(newSearchParams.toString());

// const params = new URLSearchParams({
// 	user: 'abc',
// 	query: ['first', 'second'].toString(),
// });
// params.sort();
// console.log(params.getAll('query'));
// console.log(params.toString());

// params.set('foo', 'def');
// console.log(params.has('foo', 'def'));

// const isolate = new ivm.Isolate({ memoryLimit: 128 });
// const context = isolate.createContextSync();
// const jail = context.global;
// jail.setSync('global', jail.derefInto());

// jail.setSync('log', function (...args) {
// 	console.log(...args);
// });
// context.evalSync('log("hello world")');

// const hostile = isolate.compileScriptSync(`
// 	const storage = [];
// 	const twoMegabytes = 1024 * 1024 * 2;
// 	while (true) {
// 		const array = new Uint8Array(twoMegabytes);
// 		for (let ii = 0; ii < twoMegabytes; ii += 4096) {
// 			array[ii] = 1; // we have to put something in the array to flush to real memory
// 		}
// 		storage.push(array);
// 		log('I\\'ve wasted '+ (storage.length * 2)+ 'MB');
// 	}
// `);

// hostile.run(context).catch((err) => console.error(err));

// const script = isolate.compileScriptSync(`
// const test = 2 + 2
// test + 10

// `);
// const result = await script.run(context);
// console.log({ result });

// const isolate = new ivm.Isolate({ memoryLimit: 32 });
// const script = isolate.compileModuleSync(`
//   import { FOO } from "./foo"

//   resolve(FOO);
// `);
// const context = isolate.createContextSync();
// script.instantiateSync(context, (specifier, referrer) => {
// 	if (specifier === './foo') {
// 		return isolate.compileModuleSync('export const FOO = 423;');
// 	}
// });

// let result;
// const jail = context.global;
// jail.setSync('global', jail.derefInto());
// jail.setSync(
// 	'resolve',
// 	new ivm.Callback((value) => {
// 		result = value;
// 	}),
// );
// jail.setSync('log', function (...args) {
// 	console.log(...args);
// });

// script.evaluateSync();
// console.log(`Result: ${result}`);

// const code2 = `(function() { return 'Hello, Isolate!'; })()`;

// const script = isolate.compileScriptSync(code2);
// const context = isolate.createContextSync();

// console.log(script.runSync(context));

// const script = new vm.Script(
// 	'move = function move(info) { for(var i = 0; i < 100000; i++) { console.log(i); } console.log(info) }',
// );
// const sandbox = { move: null, console: console };
// const result = script.runInNewContext(sandbox, { timeout: 1 });
// sandbox.move('done');

// const script = new vm.Script('move = function move(info) { console.log("test: " + info); }');
// var sandbox = { move: null, console: console };
// var result = script.runInNewContext(sandbox);
// sandbox.move('success');

const resolver = makeResolverFromLegacyOptions({
	external: true,
	builtin: ['fs', 'path'],
	root: './',
	mock: {
		fs: {
			readFileSync: () => 'Nice try!',
		},
	},
	import: [],
});

const util = {
	add: (a, b) => a + b,
};

const nodeVM = new NodeVM({
	console: 'inherit',
	sandbox: {
		util,
		fetch,
	},
	require: resolver,
	wrapper: 'none',
	env: {
		API_URL: 'https://jsonplaceholder.typicode.com/posts',
	},
});

const sqlLite = new Database('execution.db', { verbose: console.log });
sqlLite.pragma('journal_mode = WAL');

const insertCode = sqlLite.prepare(
	'INSERT INTO scripts (name, code) VALUES (?, ?)',
);

const getScripts = sqlLite.prepare('SELECT * from scripts');
const getScript = sqlLite.prepare('SELECT * FROM scripts WHERE name = ?');

http
	.createServer(async (request, response) => {
		if (request.method === 'GET') {
			switch (request.url) {
				case '/get': {
					response.writeHead(200, { 'Content-Type': 'application/json' });
					console.log({ method: request.method });
					const scripts = getScripts.all();
					console.log('test', scripts);
					response.end(JSON.stringify(scripts));
					break;
				}
				case '/getScript/:name': {
					response.writeHead(200, { 'Content-Type': 'application/json' });
					console.log({ method: request.method });
					const scripts = getScripts.all();
					console.log('test', scripts);
					response.end(JSON.stringify(scripts));
					break;
				}
			}
		}

		if (request.method === 'POST') {
			const chunks = [];
			request.on('data', (chunk) => {
				chunks.push(chunk);
			});
			request.on('end', async () => {
				const data = Buffer.concat(chunks);
				const stringData = data.toString();
				console.log({ stringData });
				const body = JSON.parse(stringData || '{}');

				switch (request.url) {
					case '/add': {
						if (request.method === 'POST') {
							const info = insertCode.run(body.name, body.code);
							response.end(JSON.stringify({ info }));
						}

						break;
					}
					case '/script': {
						response.writeHead(200, { 'Content-Type': 'application/json' });
						let vm = {};
						const code = body.code;
						try {
							const script = new VMScript(
								code ??
									`
								return fetch(process.env.API_URL).then(res => res.json()).then(res => {
									return res
								});
							`,
							);
							vm = await nodeVM.run(script, 'vm.js');
							console.log({ vm });
						} catch (e) {
							console.error(e);
							response.end(JSON.stringify({ error: e.message }));
							break;
						}

						response.end(JSON.stringify(vm));
						break;
					}
					default:
						break;
				}
			});
		}
	})
	.listen(8124);

console.log('Server running at http://127.0.0.1:8124/');
