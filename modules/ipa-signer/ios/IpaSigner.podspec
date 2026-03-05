require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'IpaSigner'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platform       = :ios, '13.0'
  s.swift_version  = '5.4'
  s.source         = { git: 'https://github.com/expo/expo.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'OpenSSL-Universal'
  s.dependency 'SSZipArchive'

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp,c}"
  
  # 🔴 SCRIPT TỰ ĐỘNG DIỆT CỎ TRÊN MÁY CHỦ MAC
  s.prepare_command = <<-CMD
    # Tự động tạo file ints.h ảo chứa thư viện chuẩn để lừa compiler
    mkdir -p ios/minizip
    echo '#include <stdint.h>' > ios/minizip/ints.h || true
    echo '#include <stdint.h>' > ios/ints.h || true
    
    # Tự động tìm và sửa lỗi trong ioapi.h nếu có
    find . -name "ioapi.h" -exec sed -i '' 's/"ints.h"/<stdint.h>/g' {} + || true
  CMD

  # Ép Expo biên dịch bằng C++17 và chỉ đường cho nó tìm thấy file ints.h ảo
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'gnu++17',
    'CLANG_CXX_LIBRARY' => 'libc++',
    'OTHER_CPLUSPLUSFLAGS' => '-fobjc-arc',
    'HEADER_SEARCH_PATHS' => '"${PODS_TARGET_SRCROOT}/ios" "${PODS_TARGET_SRCROOT}/ios/minizip"'
  }
end
