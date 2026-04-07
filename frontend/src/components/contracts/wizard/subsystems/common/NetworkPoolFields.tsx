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
  const bits = 0xffffffff << (32 - prefix);
  return [
    (bits >>> 24) & 0xff,
    (bits >>> 16) & 0xff,
    (bits >>> 8) & 0xff,
    bits & 0xff,
  ].join('.');
};

/** Calculate network address (first IP in CIDR) and return the first usable host address */
export const calculateFirstIP = (ip: string, prefix: number): string => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return '';

  const ipInt =
    (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
  const maskInt = prefix === 0 ? 0 : 0xffffffff << (32 - prefix);
  const networkInt = ipInt & maskInt;

  // Return first host address (network address + 1)
  const firstInt = networkInt + 1;
  return [
    (firstInt >>> 24) & 0xff,
    (firstInt >>> 16) & 0xff,
    (firstInt >>> 8) & 0xff,
    firstInt & 0xff,
  ].join('.');
};

const CIDR_PATTERN = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/;

export const NetworkPoolFields: React.FC<NetworkPoolFieldsProps> = ({
  ipPool,
  gatewayIP,
  subnetMask,
  onUpdateIpPool,
  onUpdateGateway,
  onUpdateSubnetMask,
}) => {
  const poolIsSet = !!ipPool && CIDR_PATTERN.test(ipPool);

  const handleIpPoolChange = (value: string) => {
    onUpdateIpPool(value);

    const match = value.match(CIDR_PATTERN);
    if (match) {
      const prefix = parseInt(match[2], 10);
      if (prefix >= 0 && prefix <= 32) {
        onUpdateGateway(calculateFirstIP(match[1], prefix));
        onUpdateSubnetMask(prefixToSubnetMask(prefix));
      }
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
        />
        <small className="form-help">
          Format IPv4 CIDR: XXX.XXX.XXX.XXX/Y. Automatycznie uzupełni bramę i maskę.
        </small>
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
