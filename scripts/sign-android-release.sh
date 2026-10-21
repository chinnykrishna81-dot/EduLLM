#!/usr/bin/env bash
set -euo pipefail

signing_dir=${1:?Signing directory is required}
unsigned_apk=${2:?Unsigned APK path is required}
signed_apk=${3:?Signed APK path is required}
keystore="$signing_dir/edullm-release.jks"
password_file="$signing_dir/keystore.password"

mkdir -p "$signing_dir" "$(dirname "$signed_apk")"
if [[ ! -f "$keystore" ]]; then
  umask 077
  password=$(openssl rand -hex 24)
  printf '%s' "$password" > "$password_file"
  keytool -genkeypair -keystore "$keystore" -storepass "$password" -keypass "$password" -alias edullm -keyalg RSA -keysize 4096 -validity 10000 -dname 'CN=EduLLM, OU=Mobile, O=IQ Labs Academy, L=Bengaluru, ST=Karnataka, C=IN' >/dev/null
fi

password=$(<"$password_file")
apksigner_bin=$(find "${ANDROID_HOME:-/opt/android-sdk-linux}/build-tools" -name apksigner -type f | sort -V | tail -n 1)
[[ -x "$apksigner_bin" ]] || { echo 'Android apksigner was not found' >&2; exit 1; }
"$apksigner_bin" sign --ks "$keystore" --ks-key-alias edullm --ks-pass "pass:$password" --key-pass "pass:$password" --out "$signed_apk" "$unsigned_apk"
"$apksigner_bin" verify --verbose --print-certs "$signed_apk"
