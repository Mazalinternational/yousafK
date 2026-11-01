"""One-shot: convert PuTTY PPK v3 (Argon2id) to unencrypted OpenSSH PEM."""
from __future__ import annotations

import base64
import hashlib
import hmac
import io
import struct
import sys
from pathlib import Path

from argon2.low_level import Type, hash_secret_raw
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes


def convert_ppk3(ppk_path: Path, passphrase: str) -> str:
    lines = [ln.strip("\r") for ln in ppk_path.read_text(encoding="utf-8").splitlines()]

    def take_block(start_idx: int, count: int) -> bytes:
        return base64.b64decode("".join(lines[start_idx + 1 : start_idx + 1 + count]))

    fields: dict[str, object] = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        if ": " in line:
            key, val = line.split(": ", 1)
            if key in ("Public-Lines", "Private-Lines"):
                n = int(val)
                fields[key] = take_block(i, n)
                i += n + 1
                continue
            fields[key] = val
        i += 1

    if fields.get("PuTTY-User-Key-File-3") != "ssh-rsa":
        raise SystemExit("Expected PuTTY-User-Key-File-3: ssh-rsa")
    if fields.get("Encryption") != "aes256-cbc":
        raise SystemExit("Expected Encryption: aes256-cbc")
    if fields.get("Key-Derivation") != "Argon2id":
        raise SystemExit("Expected Key-Derivation: Argon2id")

    salt = bytes.fromhex(str(fields["Argon2-Salt"]))
    memory = int(str(fields["Argon2-Memory"]))
    passes = int(str(fields["Argon2-Passes"]))
    parallelism = int(str(fields["Argon2-Parallelism"]))
    pubbin = fields["Public-Lines"]
    privbin_enc = fields["Private-Lines"]
    hexmac = str(fields["Private-MAC"])
    comment = str(fields.get("Comment", ""))
    assert isinstance(pubbin, bytes) and isinstance(privbin_enc, bytes)

    # 80 bytes: aes key(32) + iv(16) + mac key(32)
    derived = hash_secret_raw(
        secret=passphrase.encode("utf-8"),
        salt=salt,
        time_cost=passes,
        memory_cost=memory,
        parallelism=parallelism,
        hash_len=80,
        type=Type.ID,
    )
    aes_key, iv, mac_key = derived[:32], derived[32:48], derived[48:80]

    decryptor = Cipher(algorithms.AES(aes_key), modes.CBC(iv)).decryptor()
    privbin = decryptor.update(privbin_enc) + decryptor.finalize()

    def ssh_string(data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + data

    mac_body = b"".join(
        ssh_string(s)
        for s in [
            b"ssh-rsa",
            b"aes256-cbc",
            comment.encode("utf-8"),
            pubbin,
            privbin,
        ]
    )
    calc = hmac.new(mac_key, mac_body, hashlib.sha256).hexdigest()
    if calc != hexmac:
        raise SystemExit("HMAC mismatch (bad passphrase?)")

    def read_ssh_string(buf: io.BytesIO) -> bytes:
        (n,) = struct.unpack(">I", buf.read(4))
        return buf.read(n)

    def read_mpint(buf: io.BytesIO) -> int:
        return int.from_bytes(read_ssh_string(buf), "big")

    pub = io.BytesIO(pubbin)
    if read_ssh_string(pub) != b"ssh-rsa":
        raise SystemExit("Public blob is not ssh-rsa")
    e = read_mpint(pub)
    n = read_mpint(pub)

    priv = io.BytesIO(privbin)
    d = read_mpint(priv)
    p = read_mpint(priv)
    q = read_mpint(priv)
    iqmp = read_mpint(priv)

    private_numbers = rsa.RSAPrivateNumbers(
        p=p,
        q=q,
        d=d,
        dmp1=rsa.rsa_crt_dmp1(d, p),
        dmq1=rsa.rsa_crt_dmq1(d, q),
        iqmp=iqmp,
        public_numbers=rsa.RSAPublicNumbers(e=e, n=n),
    )
    private_key = private_numbers.private_key()
    return private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("ascii")


def main() -> None:
    if len(sys.argv) < 3:
        print("Usage: python convert_ppk.py <ppk> <passphrase> [out.pem]")
        sys.exit(1)
    ppk = Path(sys.argv[1])
    passphrase = sys.argv[2]
    out = Path(sys.argv[3]) if len(sys.argv) > 3 else ppk.with_suffix(".pem")
    pem = convert_ppk3(ppk, passphrase)
    out.write_text(pem, encoding="utf-8")
    print(f"OK wrote {out} ({len(pem)} chars, {private_bits(pem)} bits)")


def private_bits(pem: str) -> int:
    import paramiko

    key = paramiko.RSAKey.from_private_key(io.StringIO(pem))
    return key.get_bits()


if __name__ == "__main__":
    main()
