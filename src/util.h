//
// Created by joseph on 11/30/25.
//

#ifndef REQUEST_UNRAVER_UTIL_H
#define REQUEST_UNRAVER_UTIL_H

#include <string>

namespace request_unraver {

bool starts_with(const std::string& str, const std::string& prefix);
bool ends_with(const std::string& str, const std::string& suffix);

}

#endif //REQUEST_UNRAVER_UTIL_H