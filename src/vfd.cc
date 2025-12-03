extern "C" {
int dup(int);
int close(int);
}

static int current_max_fd = 3;

int dup(int fd) {
  current_max_fd++;
  return current_max_fd;
}

int close(int) {
  return 0;
}
