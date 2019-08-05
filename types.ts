export interface Serverless {
    service: {
        service: string;
        provider: {
            stage: string;
            stackName: string;
        };
        custom: {
            warningThreshold: number;
        };
    };
    providers: {
        aws: {
            sdk: {
                CloudFormation: any;
            };
            getCredentials();
            getRegion();
        };
    };
    cli: {
        log(str: string, entity?: string);
        consoleLog(str: any);
    };
}

export interface ServerlessOptions {
    stage: string;
}

export interface StackResource {
    LogicalResourceId: string;
    PhysicalResourceId: string;
    ResourceType: string;
    LastUpdatedTimestamp: string;
    ResourceStatus: string;
}

export interface StackResourceListResponse {
    ResponseMetadata: {
        RequestId: string;
    };
    StackResourceSummaries: StackResource[];
    NextToken?: string;
}
