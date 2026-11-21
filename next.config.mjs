/** @type {import('next').NextConfig} */
export default {
  output: "standalone", // small self-contained server for the Docker image / AWS
  outputFileTracingRoot: process.cwd(),
  allowedDevOrigins: ["10.0.2.2", "192.168.1.184"], // the Android emulator reaches this Mac's dev server at 10.0.2.2
};
