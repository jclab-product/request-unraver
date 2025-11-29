#include "vfs_manager.h"

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <memory>
#include <squash.h>
#include "static_vfs_data.h" // embedded::static_vfs_squashfs_data, embedded::static_vfs_squashfs_size

namespace request_unraver {

VfsManager::VfsManager() : vfs_(nullptr) {}

VfsManager::~VfsManager() {
  Shutdown();
}

bool VfsManager::Init(const unsigned char* data, size_t size) {
  sqfs_err err = squash_start();
  if (SQFS_OK != err) {
    fprintf(stderr, "Failed to start squash subsystem: %d\n", err);
    return false;
  }

  vfs_ = static_cast<sqfs*>(malloc(sizeof(sqfs)));
  if (!vfs_) {
    fprintf(stderr, "Failed to allocate memory for VFS.\n");
    return false;
  }

  err = sqfs_init(vfs_, data, 0);
  if (SQFS_OK != err) {
    fprintf(stderr, "Failed to init squashfs from memory: %d\n", err);
    free(vfs_);
    vfs_ = nullptr;
    return false;
  }
  printf("✓ VFS mounted successfully (%zu bytes)\n", size);

  // VFS 파일 리스트 출력 (디버깅용)
  printf("📁 VFS Files:\n");
  SQUASH_DIR* dir = squash_opendir(vfs_, "/");
  if (dir) {
    struct SQUASH_DIRENT* entry;
    while ((entry = squash_readdir(dir)) != nullptr) {
      printf("  - %s\n", entry->d_name);
    }
    squash_closedir(dir);
  }
  return true;
}

void VfsManager::Shutdown() {
  if (vfs_) {
    sqfs_destroy(vfs_);
    free(vfs_);
    vfs_ = nullptr;
  }
}

std::unique_ptr<FileBuffer> VfsManager::ReadVfsFile(const char* path) {
  if (!vfs_) {
    return nullptr;
  }

  int vfd = squash_open(vfs_, path);
  if (vfd < 0) {
    fprintf(stderr, "Failed to open VFS file: %s\n", path);
    return nullptr;
  }

  struct stat st;
  if (squash_fstat(vfd, &st) < 0) {
    squash_close(vfd);
    return nullptr;
  }

  std::unique_ptr<FileBuffer> file_buffer = std::make_unique<FileBuffer>();
  file_buffer->data.resize(st.st_size);

  ssize_t bytes_read = squash_read(vfd, &file_buffer->data[0], st.st_size);
  squash_close(vfd);

  if (bytes_read < 0) {
    return nullptr;
  }

  return std::move(file_buffer);
}

}  // namespace request_unraver