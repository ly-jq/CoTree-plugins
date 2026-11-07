const args = process.argv.slice(2);
if (args.length !== 1 || args[0].length > 4096) { console.error('Provide one text argument of at most 4096 characters'); process.exitCode = 1; } else console.log(JSON.stringify({ text: args[0], length: [...args[0]].length }));
