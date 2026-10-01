import {
  SlicanAudioAggregationValidationError,
  SlicanHierarchyAudioNode,
  SmokaAudioAggregationService
} from '../../../../src/modules/slican-audio/services/smoka-audio-aggregation.service';

const service = new SmokaAudioAggregationService();

describe('SmokaAudioAggregationService', () => {
  const nodes: SlicanHierarchyAudioNode[] = [
    {
      id: 'lcs',
      type: 'LCS',
      items: [{ id: 'dph-1', deviceType: 'DPH_IP', quantity: 1 }]
    },
    {
      id: 'nastawnia',
      type: 'Nastawnia',
      parentId: 'lcs',
      ownerId: 'lcs',
      items: [{ deviceType: 'AUDIO_IP', quantity: 2 }]
    },
    {
      id: 'przejazd',
      type: 'Przejazd',
      parentId: 'nastawnia',
      ownerId: 'lcs',
      items: [
        { deviceId: 'dph-1', deviceType: 'DPH_IP', quantity: 1 },
        { deviceType: 'CTS220_IP', quantity: 3 },
        { deviceType: 'IVR', quantity: 1 },
        { deviceType: 'CONFERENCE', quantity: 4 }
      ]
    }
  ];

  it('aggregates only the selected owner hierarchy and de-duplicates devices', () => {
    const result = service.aggregateOwner('lcs', nodes);

    expect(result.aggregate).toEqual({
      dphIpDevices: 1,
      audioIpDevices: 2,
      cts220IpDevices: 3,
      ivrChannels: 1,
      conferenceChannels: 4
    });
    expect(result.warnings).toContain(
      'Urządzenie audio dph-1 występuje pod różnymi rodzicami; zliczono je tylko raz.'
    );
  });

  it('warns and skips nodes assigned to another owner', () => {
    const result = service.aggregateOwner('lcs', [
      ...nodes,
      {
        id: 'other-owner-node',
        type: 'SKP',
        ownerId: 'other-owner',
        items: [{ deviceType: 'AUDIO_IP', quantity: 8 }]
      }
    ]);

    expect(result.aggregate.audioIpDevices).toBe(2);
    expect(result.warnings).toContain(
      'Pominięto węzły audio przypisane do innego właściciela: other-owner-node.'
    );
  });

  it('warns when the requested owner does not exist and accepts zero quantities', () => {
    expect(service.aggregateOwner('missing', nodes)).toEqual({
      aggregate: {
        dphIpDevices: 0,
        audioIpDevices: 0,
        cts220IpDevices: 0,
        ivrChannels: 0,
        conferenceChannels: 0
      },
      warnings: ['Nie znaleziono właściciela audio missing; pominięto agregację.']
    });
    expect(service.aggregateHierarchy([{
      id: 'zero',
      type: 'Point',
      items: [{ deviceType: 'IVR', quantity: 0 }]
    }]).aggregate.ivrChannels).toBe(0);
  });

  it('rejects negative quantities and unsupported device types', () => {
    expect(() => service.aggregateHierarchy([{
      id: 'invalid',
      type: 'Point',
      items: [{ deviceType: 'DPH_IP', quantity: -1 }]
    }])).toThrow(SlicanAudioAggregationValidationError);
    expect(() => service.aggregateHierarchy([{
      id: 'invalid',
      type: 'Point',
      items: [{ deviceType: 'CAMERA' as any, quantity: 1 }]
    }])).toThrow(SlicanAudioAggregationValidationError);
  });
});
