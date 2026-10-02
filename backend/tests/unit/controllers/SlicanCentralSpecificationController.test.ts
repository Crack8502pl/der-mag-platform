import { AppDataSource } from '../../../src/config/database';
import { SlicanCentralSpecificationController } from '../../../src/controllers/SlicanCentralSpecificationController';
import { SlicanCentralSelectionService } from '../../../src/services/SlicanCentralSelectionService';
import { SlicanLicenseSelectionService } from '../../../src/services/SlicanLicenseSelectionService';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: { getRepository: jest.fn() }
}));
jest.mock('../../../src/services/SlicanCentralSelectionService', () => ({
  SlicanCentralSelectionService: {
    selectCentral: jest.fn(),
    getAllCentrals: jest.fn()
  }
}));
jest.mock('../../../src/services/SlicanLicenseSelectionService', () => ({
  SlicanLicenseSelectionService: { selectLicensesForDemand: jest.fn() }
}));

describe('SlicanCentralSpecificationController', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { query: {} };
    res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    (AppDataSource.getRepository as jest.Mock).mockReturnValue({
      findOneBy: jest.fn().mockResolvedValue(null)
    });
    (SlicanCentralSelectionService.selectCentral as jest.Mock).mockResolvedValue({ id: 1 });
    (SlicanLicenseSelectionService.selectLicensesForDemand as jest.Mock).mockResolvedValue({
      licenses: [{ warehouseStockId: 2, licenseType: 'AUDIO', packageSize: 1, quantity: 3 }],
      warnings: ['license warning']
    });
  });

  it('normalizes the existing aliases and retains the endpoint response shape', async () => {
    req.query.demand = JSON.stringify({ dphIp: 1, audioIp: 2, cts220Ip: 1, ivr: 0, conf: 2 });

    await SlicanCentralSpecificationController.selectForDemand(req, res);

    const demand = {
      dphIpDevices: 1,
      audioIpDevices: 2,
      cts220IpDevices: 1,
      ivrChannels: 0,
      conferenceChannels: 2
    };
    expect(SlicanCentralSelectionService.selectCentral).toHaveBeenCalledWith(demand, 4);
    expect(SlicanLicenseSelectionService.selectLicensesForDemand).toHaveBeenCalledWith({
      sipVoipSubscribers: 4,
      audioDevices: 2,
      ivrChannels: 0,
      conferenceChannels: 2
    });
    expect(res.json).toHaveBeenCalledWith({
      central: { id: 1 },
      sipVoipSubscribers: 4,
      licenses: [{ warehouseStockId: 2, licenseType: 'AUDIO', packageSize: 1, quantity: 3 }],
      warnings: ['license warning']
    });
  });

  it('rejects duplicate alias and canonical demand fields', async () => {
    req.query.demand = JSON.stringify({
      dphIp: 1,
      dphIpDevices: 1,
      audioIp: 0,
      cts220Ip: 0,
      ivr: 0,
      conf: 0
    });

    await SlicanCentralSpecificationController.selectForDemand(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Duplicate demand field: dphIpDevices' });
    expect(SlicanCentralSelectionService.selectCentral).not.toHaveBeenCalled();
  });
});
