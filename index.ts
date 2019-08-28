'use strict';

import * as util from 'util';
import chalk from 'chalk';
import { Serverless, ServerlessOptions, StackResource, StackResourceListResponse } from './types';

class SlsCloudformationResourceCounter {
    // AWS SDK resources
    public cloudformation: any;
    public awsRegion: string;

    // Serverless specific properties
    public hooks: object;
    public stage: string;

    // Resource Counter plugin specific properties
    public warningThreshold: number;

    constructor(private serverless: Serverless, private options: ServerlessOptions) {
        this.hooks = {
            'after:deploy:deploy': this.hookWrapper.bind(this, this.countAwsResources),
        };
    }

    /**
     * Wrapper for lifecycle function, initializes variables.
     * @param lifecycleFunc lifecycle function that actually does desired action
     */
    public async hookWrapper(lifecycleFunc: any) {
        this.initializeVariables();
        return await lifecycleFunc.call(this);
    }

    /**
     * Counts the generated AWS resources.
     */
    public async countAwsResources(): Promise<void> {
        try {
            const resources = await this.getCreatedAwsResources();
            this.displayResourceCount(resources.length);
        } catch (error) {
            this.serverless.cli.log(util.format('Cannot count: %s!', error.message));
        }
    }

    /**
     * Displays a given count as a number of AWS resources created.
     * Optionally, displays a warning if provided threshold is met or exceeded.
     * @param count resource count to display
     */
    private displayResourceCount(count: number): void {
        let message = util.format('CloudFormation resources count: %d', count);
        if (this.warningThreshold && count >= this.warningThreshold) {
            message += `\n${chalk.red('WARNING:')}\n`;
            message += `${chalk.red('AWS CloudFormation has a hard limit of 200 resources for a deployed stack!')}\n`;
        }
        this.serverless.cli.log(message);
    }

    /**
     *  Gets a listing of created AWS resources
     */
    public async getCreatedAwsResources(): Promise<StackResource[]> {
        const stackResources: StackResource[] = [];
        let result: StackResourceListResponse = await this.cloudformation
            .listStackResources({ StackName: this.stackName })
            .promise();

        result.StackResourceSummaries.forEach((stackItem: StackResource) => {
            stackResources.push(stackItem);
        });

        let morePages = result.NextToken ? true : false;

        while (morePages) {
            const request = {
                NextToken: result.NextToken,
                StackName: this.stackName,
            };

            result = await this.cloudformation.listStackResources(request).promise();
            result.StackResourceSummaries.forEach((stackItem: StackResource) => {
                stackResources.push(stackItem);
            });

            morePages = result.NextToken ? true : false;
        }

        return Promise.all(stackResources);
    }

    /**
     * Initializes plugin's variables
     */
    public initializeVariables(): void {
        if (this.serverless.service.custom) {
            this.warningThreshold = this.serverless.service.custom.warningThreshold;
        }
        const credentials = this.serverless.providers.aws.getCredentials();
        this.cloudformation = new this.serverless.providers.aws.sdk.CloudFormation(credentials);
    }

    /**
     * Returns the specified stack name or the default one otherwise.
     * @returns the stack name
     */
    get stackName(): string {
        const stackName = this.serverless.service.provider.stackName;

        return (
            stackName || util.format('%s-%s', this.serverless.service.service, this.serverless.service.provider.stage)
        );
    }
}

export = SlsCloudformationResourceCounter;