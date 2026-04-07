// NetworkPoolFields.tsx
// Component for IP pool, default gateway and subnet mask with auto-fill from CIDR notation

import React from 'react';

interface NetworkPoolFieldsProps {
  ipPool: string;
  gatewayIP: string;
  subnetMask: string;
  onUpdateIpPool: (value: string) => void;
  onUpdateGateway: (value: string) => void;
  onUpdateSubnetMask: (value: string) => void;
}

/** Convert CIDR prefix to dotted subnet mask */
export const prefixToSubnetMask = (prefix: number): string => {
  if (prefix < 0 || prefix > 32) return '';
  const bits = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return [
    (bits >>> 24) & 0xff,
    (bits >>> 16) & 0xff,
    (bits >>> 8) & 0xff,
    bits & 0xff,
  ].join('.');
};

/** Calculate network address (first IP in CIDR) and return the first usable host address.
 * /32: returns the single host address itself (gateway is the host itself).
 * /31: returns the lower address per RFC 3021.
 * Otherwise: returns network address + 1 (first usable host). */
export const calculateFirstIP = (ip: string, prefix: number): string => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return '';

  const ipInt =
    ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  const maskInt = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const networkInt = (ipInt & maskInt) >>> 0;

  // /32: single host, return that address itself
  if (prefix === 32) {
    return ip.split('/')[0];
  }
  // /31: RFC 3021 - both addresses are usable, return the lower address
  if (prefix === 31) {
    return [
      (networkInt >>> 24) & 0xff,
      (networkInt >>> 16) & 0xff,
      (networkInt >>> 8) & 0xff,
      networkInt & 0xff,
    ].join('.');
  }

  // Standard: return network address + 1 (first usable host)
  const firstInt = (networkInt + 1) >>> 0;
  return [
    (firstInt >>> 24) & 0xff,
    (firstInt >>> 16) & 0xff,
    (firstInt >>> 8) & 0xff,
    firstInt & 0xff,
  ].join('.');
};

const CIDR_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;

/** Returns true only when the pool string is a valid IPv4 CIDR with all octets 0-255 and prefix 0-32. */
const isValidCidr = (pool: string): boolean => {
  const match = pool.trim().match(CIDR_PATTERN);
  if (!match) return false;
  const octets = [match[1], match[2], match[3], match[4]].map(Number);
  if (octets.some(o => o < 0 || o > 255)) return false;
  const prefix = parseInt(match[5], 10);
  return prefix >= 0 && prefix <= 32;
};

export const NetworkPoolFields: React.FC<NetworkPoolFieldsProps> = ({
  ipPool,
  gatewayIP,
  subnetMask,
  onUpdateIpPool,
  onUpdateGateway,
  onUpdateSubnetMask,
}) => {
  const poolIsSet = isValidCidr(ipPool);
  const poolHasInput = ipPool.trim().length > 0;
  const poolIsInvalid = poolHasInput && !poolIsSet;

  const handleIpPoolChange = (value: string) => {
    onUpdateIpPool(value);

    if (isValidCidr(value)) {
      const match = value.trim().match(CIDR_PATTERN)!;
      const ip = `${match[1]}.${match[2]}.${match[3]}.${match[4]}`;
      const prefix = parseInt(match[5], 10);
      onUpdateGateway(calculateFirstIP(ip, prefix));
      onUpdateSubnetMask(prefixToSubnetMask(prefix));
    }
  };

  return (
    <>
      <div className="form-group">
        <label>Pula adresacji <span className="text-muted">(opcjonalnie)</span></label>
        <input
          type="text"
          value={ipPool}
          onChange={(e) => handleIpPoolChange(e.target.value)}
          placeholder="np. 192.168.1.0/24"
          autoComplete="off"
          spellCheck={false}
        />
        {poolIsInvalid && (
          <small className="form-help text-error">
            ⚠️ Nieprawidłowy format. Użyj zapisu CIDR, np. 192.168.1.0/24
          </small>
        )}
        {!poolIsInvalid && (
          <small className="form-help">
            Format IPv4 CIDR: XXX.XXX.XXX.XXX/Y. Automatycznie uzupełni bramę i maskę.
          </small>
        )}
      </div>

      <div className="form-group">
        <label>Brama Domyślna <span className="text-muted">(opcjonalnie)</span></label>
        <input
          type="text"
          value={gatewayIP}
          onChange={(e) => onUpdateGateway(e.target.value)}
          placeholder="np. 192.168.1.1"
          readOnly={poolIsSet}
          className={poolIsSet ? 'form-control-readonly' : ''}
        />
        {poolIsSet && (
          <small className="form-help text-success">✓ Uzupełnione automatycznie z puli adresacji</small>
        )}
      </div>

      <div className="form-group">
        <label>Maska Podsieci <span className="text-muted">(opcjonalnie)</span></label>
        <input
          type="text"
          value={subnetMask}
          onChange={(e) => onUpdateSubnetMask(e.target.value)}
          placeholder="np. 255.255.255.0"
          readOnly={poolIsSet}
          className={poolIsSet ? 'form-control-readonly' : ''}
        />
        {poolIsSet && (
          <small className="form-help text-success">✓ Uzupełnione automatycznie z puli adresacji</small>
        )}
      </div>
    </>
  );
};
