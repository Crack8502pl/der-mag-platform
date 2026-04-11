// NetworkPoolFields.tsx
// Component for IP pool, default gateway and subnet mask with auto-fill from CIDR notation

import React, { useState } from 'react';
import networkService from '../../../../../services/network.service';

interface NetworkPoolFieldsProps {
  ipPool: string;
  gatewayIP: string;
  subnetMask: string;
  onUpdateIpPool: (value: string) => void;
  onApplyNetworkResult: (gateway: string, subnet: string) => void;
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
  onApplyNetworkResult,
}) => {
  const [checking, setChecking] = useState(false);
  const [validationMessage, setValidationMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const poolHasInput = ipPool.trim().length > 0;
  const poolIsInvalid = poolHasInput && !isValidCidr(ipPool);

  const handleIpPoolChange = (value: string) => {
    onUpdateIpPool(value);
    setValidationMessage(null);
    // Clear derived fields when the user modifies the CIDR
    if (gatewayIP || subnetMask) {
      onApplyNetworkResult('', '');
    }
  };

  const handleCheckAvailability = async () => {
    if (!isValidCidr(ipPool)) {
      setValidationMessage({
        type: 'error',
        text: '⚠️ Nieprawidłowy format CIDR. Użyj zapisu jak 192.168.1.0/24'
      });
      return;
    }

    setChecking(true);
    setValidationMessage(null);

    try {
      const result = await networkService.checkCIDRAvailability(ipPool.trim());

      if (result.available) {
        const match = ipPool.trim().match(CIDR_PATTERN)!;
        const ip = `${match[1]}.${match[2]}.${match[3]}.${match[4]}`;
        const prefix = parseInt(match[5], 10);

        onApplyNetworkResult(calculateFirstIP(ip, prefix), prefixToSubnetMask(prefix));

        setValidationMessage({
          type: 'success',
          text: '✅ Pula dostępna - wygenerowano bramę i maskę podsieci'
        });
      } else {
        onApplyNetworkResult('', '');
        setValidationMessage({
          type: 'error',
          text: `❌ ${result.message}`
        });
      }
    } catch (err) {
      onApplyNetworkResult('', '');
      console.error('NetworkPoolFields: error checking CIDR availability', err);
      setValidationMessage({
        type: 'error',
        text: '❌ Błąd sprawdzania dostępności puli IP'
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <div className="form-group">
        <label>Pula adresacji <span className="text-muted">(opcjonalnie)</span></label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <input
            type="text"
            value={ipPool}
            onChange={(e) => handleIpPoolChange(e.target.value)}
            placeholder="np. 192.168.1.0/24"
            autoComplete="off"
            spellCheck={false}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCheckAvailability}
            disabled={!poolHasInput || checking}
            style={{ whiteSpace: 'nowrap' }}
          >
            {checking ? '⏳ Sprawdzam...' : '🔄 Sprawdź'}
          </button>
        </div>

        {poolIsInvalid && !validationMessage && (
          <small className="form-help text-error">
            ⚠️ Nieprawidłowy format. Użyj zapisu CIDR, np. 192.168.1.0/24
          </small>
        )}

        {validationMessage && (
          <small className={`form-help ${validationMessage.type === 'error' ? 'text-error' : 'text-success'}`}>
            {validationMessage.text}
          </small>
        )}

        {!poolIsInvalid && !validationMessage && (
          <small className="form-help">
            Format IPv4 CIDR: XXX.XXX.XXX.XXX/Y. Kliknij "Sprawdź" aby walidować i wygenerować parametry sieci.
          </small>
        )}
      </div>

      <div className="form-group">
        <label>Brama Domyślna <span className="text-muted">(auto)</span></label>
        <input
          type="text"
          value={gatewayIP}
          readOnly
          placeholder="Zostanie wygenerowana automatycznie"
          className="form-control-readonly"
        />
        {gatewayIP && (
          <small className="form-help text-success">✓ Wygenerowane z puli adresacji</small>
        )}
      </div>

      <div className="form-group">
        <label>Maska Podsieci <span className="text-muted">(auto)</span></label>
        <input
          type="text"
          value={subnetMask}
          readOnly
          placeholder="Zostanie wygenerowana automatycznie"
          className="form-control-readonly"
        />
        {subnetMask && (
          <small className="form-help text-success">✓ Wygenerowane z puli adresacji</small>
        )}
      </div>
    </>
  );
};
