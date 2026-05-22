const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'node_modules', '@msg91comm', 'sendotp-react-native', 'index.ts');
if (fs.existsSync(targetFile)) {
  try {
    let content = fs.readFileSync(targetFile, 'utf8');
    if (content.includes("console.error('BiometricAuth is undefined! Ensure the native module is properly linked.');")) {
      content = content.replace(
        "console.error('BiometricAuth is undefined! Ensure the native module is properly linked.');",
        "console.warn('BiometricAuth is undefined! Ensure the native module is properly linked.');"
      );
      fs.writeFileSync(targetFile, content, 'utf8');
      console.log('Successfully patched MSG91 SDK BiometricAuth crash.');
    } else {
      console.log('MSG91 SDK already patched or console.error signature not found.');
    }
  } catch (error) {
    console.error('Error patching MSG91 SDK:', error);
  }
} else {
  console.log('MSG91 SDK target file index.ts not found. Make sure dependencies are installed.');
}
