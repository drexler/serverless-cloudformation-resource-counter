
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

  private fetch(): Promise<any> {
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
    .then(() => this.fetch()
    ).then((res) => this.serverless.cli.log(util.format('CloudFormation resource count: %s', JSON.stringify(res)))
    ).catch((err) => this.serverless.cli.log(util.format('Cannot count: %s!', err.message))
    );
  }

}
