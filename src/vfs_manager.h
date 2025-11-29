#ifndef REQUEST_UNRAVER_VFS_MANAGER_H_
#define REQUEST_UNRAVER_VFS_MANAGER_H_

#include <cstddef> // for size_t

extern "C" {
#include <squash.h>
}

#include <vector>

namespace request_unraver {

struct FileBuffer {
public:
 std::vector<uint8_t> data;
};

class VfsManager {
 public:
  VfsManager();
  ~VfsManager();

  bool Init(const unsigned char* data, size_t size);
  void Shutdown();
  std::unique_ptr<FileBuffer> ReadVfsFile(const char* path);

  sqfs* vfs() const { return vfs_; }

 private:
  sqfs* vfs_;
};

}  // namespace request_unraver

#endif  // REQUEST_UNRAVER_VFS_MANAGER_H_