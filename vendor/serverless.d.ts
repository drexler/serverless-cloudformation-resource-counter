declare namespace Serverless {
    interface Options {
      stage: string | null
      region: string | null
      noDeploy?: boolean
    }
    
    namespace Provider {

      interface IProviderContextName {
        stackName: string;
      }
      class Aws {
        constructor(serverless: Serverless, options: Serverless.Options)
        
        getProviderName: () => string
        getRegion: () => string
        getServerlessDeploymentBucketName: () => string
        getStage: () => string
        request: (service: string, method: string, data: {}, stage: string, region: string) => Promise<any>

        naming: IProviderContextName
      }
    }
  }
  
  declare interface Serverless {
    init(): Promise<any>
    run(): Promise<any>
    
    setProvider(name: string, provider: Serverless.Provider.Aws): null
    getProvider(name: string): Serverless.Provider.Aws
    
    getVersion(): string
    
    cli: {
      log(message: string): null
    }
    
    config: {
      servicePath: string
    }
  
    service: {
      getServiceName(): string
      getAllFunctions(): string[]
        
      provider: {
        name: string
      }

      custom: {
            warningThreshold: number
      }
    }
  }
  