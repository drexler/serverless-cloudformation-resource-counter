import * as aws from 'aws-sdk';
import * as AWS from 'aws-sdk-mock';
import * as sinon from 'sinon';
import chalk from 'chalk';

import { TestUtils } from '../utils';
import SlsCloudformationResourceCounter = require('../../index');
import { Serverless, ServerlessOptions } from '../../types';

let consoleOutput = [];
const testAwsCredentials = {
    accessKeyId: 'test_key',
    secretAccessKey: 'test_secret',
    sessionToken: 'test_session',
};

const testUtils = new TestUtils();

const testRegion = 'us-east-1';

const constructPlugin = (pluginOptions, useDefaultStackName?: boolean) => {
    aws.config.update(testAwsCredentials);
    aws.config.region = testRegion;

    const serverless: Serverless = {
        service: {
            service: 'api-service',
            provider: {
                stage: 'test',
                stackName: 'custom-stack-name',
            },
            custom: {
                warningThreshold: pluginOptions.warningThreshold,
            },
        },
        providers: {
            aws: {
                getCredentials: () => new aws.Credentials(testAwsCredentials),
                getRegion: () => testRegion,
                sdk: {
                    CloudFormation: aws.CloudFormation,
                },
            },
        },
        cli: {
            log(str: string) {
                consoleOutput.push(str);
            },
            consoleLog(str: any) {
                consoleOutput.push(str);
            },
        },
    };

    const options: ServerlessOptions = {
        stage: 'test',
    };

    if (useDefaultStackName) {
        delete serverless.service.provider.stackName;
    }

    if (!pluginOptions.warningThreshold) {
        delete serverless.service.custom;
    }

    return new SlsCloudformationResourceCounter(serverless, options);
};

describe('Resource Counter Plugin', () => {
    it('imports AWS credentials', () => {
        const plugin = constructPlugin({});

        plugin.initializeVariables();

        const { credentials, region } = plugin.cloudformation.config;
        expect(credentials.accessKeyId).toEqual(testAwsCredentials.accessKeyId);
        expect(credentials.sessionToken).toEqual(testAwsCredentials.sessionToken);
        expect(region).toEqual(testRegion);
    });

    it('gracefully fails with an error message on crash', async () => {
        const errorReason = 'Oopsies';
        AWS.mock('CloudFormation', 'listStackResources', (params, callback) => {
            callback(null, testUtils.createMockAwsStackResourceList({ itemCount: 2 }));
        });

        const plugin = constructPlugin({});
        plugin.initializeVariables();
        plugin.cloudformation = new aws.CloudFormation();
        plugin.getCreatedAwsResources = jest.fn(() => {
            throw new Error(errorReason);
        });

        await plugin.countAwsResources();

        const expectedErrorMessage = `Cannot count: ${errorReason}!`;
        expect(consoleOutput.length).toBe(1);
        expect(consoleOutput[0]).toEqual(expectedErrorMessage);
    });

    it('uses custom stack name, if defined', () => {
        const plugin = constructPlugin({});
        plugin.initializeVariables();
        expect(plugin.stackName).toBe('custom-stack-name');
    });

    it('uses generated default stack name, if a custom stack name is not defined', () => {
        const plugin = constructPlugin({}, true);
        plugin.initializeVariables();
        expect(plugin.stackName).toBe('api-service-test');
    });

    describe('counts generated AWS resources', () => {
        beforeEach(() => {
            AWS.restore();
            consoleOutput = [];
        });

        it('after Serverless deploy', async () => {
            const itemCount = 4;

            AWS.mock('CloudFormation', 'listStackResources', (params, callback) => {
                callback(null, testUtils.createMockAwsStackResourceList({ itemCount }));
            });

            const plugin = constructPlugin({});
            plugin.cloudformation = new aws.CloudFormation();
            const pluginCountResourcesSpy = jest.spyOn(plugin, 'countAwsResources');

            await plugin.hookWrapper(plugin.countAwsResources);

            expect(pluginCountResourcesSpy).toHaveBeenCalledTimes(1);

            const expectedResourceCountMessage = `CloudFormation resources count: ${itemCount}`;
            expect(consoleOutput.length).toBe(1);
            expect(consoleOutput[0]).toEqual(expectedResourceCountMessage);
        });

        it('with no threshold warning set', async () => {
            const itemCount = 4;

            AWS.mock('CloudFormation', 'listStackResources', (params, callback) => {
                callback(null, testUtils.createMockAwsStackResourceList({ itemCount }));
            });

            const plugin = constructPlugin({});
            plugin.initializeVariables();
            plugin.cloudformation = new aws.CloudFormation();
            const spy = jest.spyOn(plugin.cloudformation, 'listStackResources');

            await plugin.countAwsResources();

            expect(spy).toHaveBeenCalledWith({ StackName: plugin.stackName });

            const expectedResourceCountMessage = `CloudFormation resources count: ${itemCount}`;
            expect(consoleOutput.length).toBe(1);
            expect(consoleOutput[0]).toEqual(expectedResourceCountMessage);
        });

        it('with threshold warning set', async () => {
            const itemCount = 130;

            AWS.mock('CloudFormation', 'listStackResources', (params, callback) => {
                callback(null, testUtils.createMockAwsStackResourceList({ itemCount }));
            });

            const plugin = constructPlugin({ warningThreshold: 123 });
            plugin.initializeVariables();
            plugin.cloudformation = new aws.CloudFormation();

            await plugin.countAwsResources();

            let expectedResourceCountMessage = `CloudFormation resources count: ${itemCount}`;
            expectedResourceCountMessage += `\n${chalk.red('WARNING:')}\n`;
            expectedResourceCountMessage += `${chalk.red(
                'AWS CloudFormation has a hard limit of 200 resources for a deployed stack!',
            )}\n`;

            expect(consoleOutput.length).toBe(1);
            expect(consoleOutput[0]).toEqual(expectedResourceCountMessage);
        });

        it('with a paginated resources list', async () => {
            const maxPageItemsCount = 30;
            const limitedItemsCount = 5;
            let combinedCount = 0;

            // Set up mock where the first two result sets are paginated:
            let invocationCounter = 0;
            const mockCallbackFunc = (params, callback) => {
                let retval;
                switch (invocationCounter) {
                    case 2:
                        retval = testUtils.createMockAwsStackResourceList({ itemCount: limitedItemsCount });
                        combinedCount += limitedItemsCount;
                        break;

                    case 1:
                    default:
                        retval = testUtils.createMockAwsStackResourceList({
                            itemCount: maxPageItemsCount,
                            paginated: true,
                        });
                        combinedCount += maxPageItemsCount;
                        break;
                }
                ++invocationCounter;

                callback(null, retval);
            };

            AWS.mock('CloudFormation', 'listStackResources', mockCallbackFunc);

            const plugin = constructPlugin({});
            plugin.initializeVariables();
            plugin.cloudformation = new aws.CloudFormation();
            const spy = jest.spyOn(plugin.cloudformation, 'listStackResources');

            await plugin.countAwsResources();

            expect(spy).toHaveBeenCalledTimes(invocationCounter);
            expect(spy).toHaveBeenNthCalledWith(1, { StackName: plugin.stackName });
            expect(spy).toHaveBeenNthCalledWith(2, { StackName: plugin.stackName, NextToken: 'nextToken' });

            const expectedResourceCountMessage = `CloudFormation resources count: ${combinedCount}`;
            expect(consoleOutput.length).toBe(1);
            expect(consoleOutput[0]).toEqual(expectedResourceCountMessage);
        });
    });
});
