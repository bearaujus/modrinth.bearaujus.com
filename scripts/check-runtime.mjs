const [major, minor] = process.versions.node.split('.').map(Number);
const supported = major === 22 && minor >= 12;

if (!supported) {
  console.error(
    `Unsupported Node.js ${process.versions.node}. Use Node.js >=22.12.0 <23 (see .nvmrc).`,
  );
  process.exitCode = 1;
} else {
  console.log(`Node.js ${process.versions.node} satisfies the tested 22.x runtime.`);
}
