require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

platform :ios, min_ios_version_supported
prepare_react_native_project!

# Disable Flipper and use static frameworks for Firebase
use_frameworks! :linkage => :static

target 'waterApp' do
  config = use_native_modules!

  # Firebase pods
  pod 'Firebase', :modular_headers => true
  pod 'FirebaseCore', :modular_headers => true
  pod 'GoogleUtilities', :modular_headers => true
  pod 'FirebaseCoreInternal', :modular_headers => true
  
  use_react_native!(
    :path => config[:reactNativePath],
    :flipper_configuration => FlipperConfiguration.disabled,
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )

  pod 'RNVectorIcons', :path => '../node_modules/react-native-vector-icons'

  target 'waterAppTests' do
    inherit! :complete
  end

  post_install do |installer|
    react_native_post_install(installer)
    
    # Add this block for Firebase compatibility
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '12.0'
        config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'YES'
      end
    end
  end
end 