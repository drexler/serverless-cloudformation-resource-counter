
import * as util from 'util';

export class CloudFormationResourceCounterPlugin {
  public hooks: {};

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.hooks = {
      'after:deploy:deploy': this.process.bind(this),
    };

  }

  get stackName(): string {
    return util.format('%s-%s',
      this.serverless.service.getServiceName(),
      this.serverless.getProvider('aws').getStage(),
    );
  }

  private fetch(request): Promise<StackResourceListResponse> {
    return this.serverless.getProvider('aws').request(
      'CloudFormation',
      'listStackResources',
      request,
      this.serverless.getProvider('aws').getStage(),
      this.serverless.getProvider('aws').getRegion(),
    );
  }

  private async fetchStackResources(): Promise<StackResource[]> {
    const stackResources: StackResource[] = [];
    let result: StackResourceListResponse = await this.fetch({StackName: this.stackName });
    result.StackResourceSummaries.forEach((stackItem: StackResource) => {
       stackResources.push(stackItem);
    });

    let morePages = result.NextToken ? true : false;

    while (morePages) {
        const request = {
          NextToken: result.NextToken,
          StackName: this.stackName,
        };

        result = await this.fetch(request);
        result.StackResourceSummaries.forEach((stackItem: StackResource) => {
            stackResources.push(stackItem);
        });

        morePages = result.NextToken ? true : false;
    }

    return Promise.all(stackResources);

  }

  private count(resources: StackResource[]): number {
     return resources.length;
  }

  private process() {
    Promise.resolve()
    .then(() => this.fetchStackResources())
    .then((response: StackResource[]) => {
      const message = util.format('CloudFormation resource count: %d', this.count(response));
      this.serverless.cli.log(message);
    })
    .catch((error) => this.serverless.cli.log(util.format('Cannot count: %s!', error.message)));
  }

}
