/** @type {import('next').NextConfig} */
export default {
  output: "standalone", // small self-contained server for the Docker image / AWS
  outputFileTracingRoot: process.cwd(),
};
