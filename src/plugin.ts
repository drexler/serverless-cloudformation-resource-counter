
import * as util from 'util';
import chalk from 'chalk';

export class CloudFormationResourceCounterPlugin {
  public hooks: {};

  private warningThresholdOption: number;

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.hooks = {
      'after:deploy:deploy': this.process.bind(this),
    };
    this.warningThresholdOption = this.serverless.service.custom.warningThreshold;
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
      const resourceCount = this.count(response);
      let message = util.format('CloudFormation resource count: %d', resourceCount);
      if (this.warningThresholdOption && resourceCount >= this.warningThresholdOption) {
        message += `\n${chalk.red('WARNING:')}\n`;
        message += `${chalk.red('AWS CloudFormation has a hard limit of 200 resources for a deployed stack!')}\n`;
      }
      this.serverless.cli.log(message);
    })
    .catch((error) => this.serverless.cli.log(util.format('Cannot count: %s!', error.message)));
  }

}
