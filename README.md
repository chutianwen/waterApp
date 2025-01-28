# Water App - React Native iOS Application

## Project Setup

### Prerequisites
- Node.js (>=18)
- Xcode
- CocoaPods
- Ruby

### Initial Project Creation
```bash
# Create new React Native project with TypeScript template
npx react-native init waterApp --template react-native-template-typescript

If not working, use this:
npx @react-native-community/cli init waterApp --version 0.73.5

# Navigate to project directory
cd waterApp

# Install dependencies
npm install

# Install required navigation and UI dependencies
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack react-native-vector-icons react-native-screens react-native-safe-area-context @react-native-async-storage/async-storage
```

### Version Control Setup
The project includes a comprehensive `.gitignore` file that excludes:
- Build artifacts and dependencies (`/ios/Pods/`, `node_modules/`)
- IDE and editor files (`.vscode/`, Xcode userdata)
- Environment and local config files (`.env`)
- Temporary and system files (`.DS_Store`)
- Debug logs and crash reports
- Test coverage reports

Make sure to commit the `.gitignore` file first before adding other project files to avoid tracking unnecessary files.

### iOS Setup
```bash
# Navigate to iOS directory
cd ios

# Install CocoaPods dependencies
# Some issues of faliures, please refer to flipper error which needs to be disabled through the podfile.
pod install

```

### Running the App
```bash
# Start Metro bundler (in project root)
npx react-native start

# In another terminal, build and run iOS app
npx react-native run-ios
```

## Common Issues and Solutions

### 1. CocoaPods Post-Install Hook Error
**Error:**
```
An error occurred while processing the post-install hook of the Podfile.
undefined method '__apply_Xcode_12_5_M1_post_install_workaround' for an instance of Pod::Podfile
```

**Solution:**
This error occurs due to an outdated post-install hook in the Podfile. To fix:
1. Open `ios/Podfile`
2. Update the post_install hook to remove the outdated M1 workaround:
```ruby
post_install do |installer|
  react_native_post_install(installer)
end
```

### 2. Metro Bundler Directory Error
**Error:**
```
npm error code ENOENT
npm error syscall open
npm error path /Users/.../package.json
npm error errno -2
npm error enoent Could not read package.json
```

**Solution:**
This occurs when trying to run Metro bundler from the wrong directory. Always ensure you're in the project root directory:
```bash
cd /path/to/waterApp
npx react-native start
```

### 3. Vector Icons Not Showing
**Error:**
Icons appear as squares or are missing in the iOS app.

**Solution:**
1. Add RNVectorIcons to Podfile:
```ruby
pod 'RNVectorIcons', :path => '../node_modules/react-native-vector-icons'
```

2. Add fonts to Info.plist:
```xml
<key>UIAppFonts</key>
<array>
  <string>Ionicons.ttf</string>
</array>
```

3. Reinstall pods:
```bash
cd ios && pod install
```

### 4. FlipperKit Build Error
**Error:**
```
The following build commands failed:
CompileC [...]/FlipperKit.build/Debug-iphonesimulator/FlipperKit.build/Objects-normal/arm64/FlipperPlatformWebSocket.o [...]/FlipperKit/iOS/FlipperKit/FlipperPlatformWebSocket.mm normal arm64 objective-c++ com.apple.compilers.llvm.clang.1_0.compiler
```

**Solution:**
This error occurs due to Flipper compatibility issues with newer iOS versions. To fix:
1. Open `ios/Podfile`
2. Replace the Flipper configuration with:
```ruby
# Disable Flipper
use_frameworks! :linkage => :static

target 'YourAppName' do
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    # Disable Flipper
    :flipper_configuration => FlipperConfiguration.disabled,
    # An absolute path to your application root.
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )
  # ... rest of your Podfile
end
```
3. Clean and reinstall pods:
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
```

Note: Flipper is a debugging tool, and disabling it won't affect your app's functionality.

## Development Tips

### Hot Reloading
- The app supports hot reloading by default
- Changes to your React Native code will automatically reflect in the simulator
- If changes don't appear, try reloading the app (Cmd + R in simulator)

### iOS Simulator
- The app will launch in the default iOS simulator
- You can specify a different simulator using the --simulator flag:
```bash
npx react-native run-ios --simulator="iPhone 14 Pro"
```

## Project Structure
```
waterApp/
├── ios/                # iOS native code
├── android/            # Android native code
├── src/               # React Native source code
│   ├── screens/       # Screen components
│   ├── services/      # Business logic and API services
│   └── types/         # TypeScript type definitions
├── __tests__/         # Test files
├── node_modules/      # Dependencies
├── package.json       # Project configuration
└── README.md         # Project documentation
```

## Dependencies
- React Native: 0.73.5
- React: 18.2.0
- TypeScript: 5.0.4
- React Navigation: 6.x
- React Native Vector Icons: 10.2.0
- AsyncStorage: 2.1.0

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
This project is licensed under the MIT License - see the LICENSE file for details
