#!/bin/bash
# modules 디렉토리를 squashfs로 패킹하고 C++ 헤더로 변환

set -e

INPUT_DIR="$1"
OUTPUT_SQUASH="$2"
OUT_NAME="$3"
OUT_VAR="$4"

OUTPUT_DEFINE_NAME=$(echo $OUT_VAR | tr '[:upper:]' '[:lower:]')_H
OUTPUT_HEADER="${OUT_NAME}.h"
OUTPUT_CPP="${OUT_NAME}.cc"

echo "📦 Packing modules to SquashFS..."

# modules를 squashfs로 패킹
mksquashfs "$INPUT_DIR" "$OUTPUT_SQUASH" \
    -noappend \
    -comp gzip \
    -no-xattrs \
    -all-root

echo "✓ SquashFS created: $OUTPUT_SQUASH"
echo "📊 Size: $(du -h "$OUTPUT_SQUASH" | cut -f1)"

# 바이너리를 C++ 헤더 파일로 변환
echo "🔄 Converting to C++ header..."

cat > "$OUTPUT_HEADER" << EOF
/*
 * Auto-generated file containing embedded modules as SquashFS
 * DO NOT EDIT MANUALLY
 */
#ifndef ${OUTPUT_DEFINE_NAME}
#define ${OUTPUT_DEFINE_NAME}

#include <cstddef>
#include <cstdint>

namespace embedded {

extern const uint8_t ${OUT_VAR}_data[];
extern const size_t ${OUT_VAR}_size;

} // namespace embedded

#endif // ${OUTPUT_DEFINE_NAME}
EOF

echo "✓ Header created: $OUTPUT_HEADER"

OUTPUT_HEADER_FILENAME=$(basename "${OUTPUT_HEADER}")

echo "/*" > "$OUTPUT_CPP"
echo " * Auto-generated file containing embedded modules as SquashFS" >> "$OUTPUT_CPP"
echo " * DO NOT EDIT MANUALLY" >> "$OUTPUT_CPP"
echo " */" >> "$OUTPUT_CPP"
echo "" >> "$OUTPUT_CPP"
 echo "#include \"${OUTPUT_HEADER_FILENAME}\"" >> "$OUTPUT_CPP"
echo "" >> "$OUTPUT_CPP"
echo "namespace embedded {" >> "$OUTPUT_CPP"
echo "" >> "$OUTPUT_CPP"

# xxd를 사용하여 바이너리를 C 배열로 변환
echo "const uint8_t ${OUT_VAR}_data[] = {" >> "$OUTPUT_CPP"
xxd -i < "$OUTPUT_SQUASH" | sed 's/^/  /' >> "$OUTPUT_CPP"
echo "};" >> "$OUTPUT_CPP"
echo "" >> "$OUTPUT_CPP"

# 크기 정보 추가
SQUASH_SIZE=$(stat -c%s "$OUTPUT_SQUASH" 2>/dev/null || stat -f%z "$OUTPUT_SQUASH")
echo "const size_t ${OUT_VAR}_size = ${SQUASH_SIZE}UL;" >> "$OUTPUT_CPP"
echo "" >> "$OUTPUT_CPP"
echo "} // namespace embedded" >> "$OUTPUT_CPP"

echo "✓ Source created: $OUTPUT_CPP"
echo "📊 Data size: $SQUASH_SIZE bytes"
echo "✅ Modules packed successfully!"