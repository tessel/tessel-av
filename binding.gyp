{
  "targets": [
    {
      "target_name": "capture",
      "include_dirs" : [
        "<!(node -e \"require('nan')\")"
      ],
      "conditions": [
        [
          "OS=='mac'", {
            "sources": [
              "src/mac/capture_module.cc",
              "src/mac/capture.m"
            ],
            "xcode_settings": {
              "OTHER_CFLAGS": [
                "-fobjc-arc",
                "-mmacosx-version-min=10.7"
              ],
            },
            "link_settings": {
              "libraries": [
                "-framework",
                "Foundation",
                "$(SDKROOT)/System/Library/Frameworks/Cocoa.framework",
                "$(SDKROOT)/System/Library/Frameworks/QuartzCore.framework",
                "$(SDKROOT)/System/Library/Frameworks/CoreMedia.framework",
                "$(SDKROOT)/System/Library/Frameworks/AVFoundation.framework",
              ]
            }
          }
        ]
      ]
    }
  ]
}
