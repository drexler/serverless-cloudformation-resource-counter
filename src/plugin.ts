
import * as util from 'util';

export default class CloudFormationResourceCounterPlugin {
  public hooks: {};

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.hooks = {
      'after:deploy:deploy': this.process.bind(this)
    }

  }

  get stackName(): string {
    return util.format('%s-%s',
      this.serverless.service.getServiceName(),
      this.serverless.getProvider('aws').getStage()
    );
  }

  private fetch(): Promise<StackResourceListResponse> {
    return this.serverless.getProvider('aws').request(
      'CloudFormation',
      'listStackResources',
      { StackName: this.stackName },
      this.serverless.getProvider('aws').getStage(),
      this.serverless.getProvider('aws').getRegion()
    );
  }

  private count(resources: StackResource[]): number {
     return resources.length;
  }

  private process() {
    Promise.resolve()
    .then(() => this.fetch())
    .then((response: StackResourceListResponse) => {
      const message = util.format('CloudFormation resource count: %d', this.count(response.StackResourceSummaries));
      this.serverless.cli.log(message);
    })
    .catch((error) => this.serverless.cli.log(util.format('Cannot count: %s!', error.message)));
  }

}
