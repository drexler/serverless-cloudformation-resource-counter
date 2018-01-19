declare interface StackResource {
    LogicalResourceId: string
    PhysicalResourceId: string
    ResourceType: string
    LastUpdatedTimestamp: string
    ResourceStatus: string
}

declare interface StackResourceListResponse {
    ResponseMetadata: {
        RequestId: string
    }

    StackResourceSummaries: StackResource[]
}


  