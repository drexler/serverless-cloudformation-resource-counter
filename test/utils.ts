import { StackResource, StackResourceListResponse } from '../types';

export class TestUtils {
    public createMockAwsStackResourceList({
        itemCount,
        paginated,
    }: {
        [i: string]: number | boolean;
    }): StackResourceListResponse {
        const response: StackResourceListResponse = {
            ResponseMetadata: {
                RequestId: '0123456789',
            },
            StackResourceSummaries: this.createMockAwsStackResources(itemCount as number),
        };

        if (paginated as boolean) {
            response.NextToken = 'nextToken';
        }

        return response;
    }

    private createMockAwsStackResources(count: number): StackResource[] {
        const resources: StackResource[] = [];

        let gen = this.resourceGenerator();

        for (let i = 0; i < count; i++) {
            resources.push(gen.next().value);
        }

        return resources;
    }

    private *resourceGenerator(): IterableIterator<StackResource> {
        let index = 1;
        const resource: StackResource = {
            LogicalResourceId: `test-resource-${index}-logicial-id`,
            PhysicalResourceId: `test-resource-${index}-physical-id`,
            ResourceType: 'aws-lambda',
            LastUpdatedTimestamp: 'sometime',
            ResourceStatus: 'created',
        };
        ++index;
        yield resource;
    }
}
