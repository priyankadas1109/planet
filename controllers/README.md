# Controllers

Notes on controllers we could explore to interact with data from AI APIs

Controllers where AWS Lambda can call an endpoint like /etl, allowing the data service to parse files from the source database into Snowflake - with TypeScript. These can be applied to AI APIs as well.

To make async API calls:

In 2019, SpaceX began using Apache ActiveMQ for StarLink dish manufacturing to make async API calls apart from the main Warp Drive starship manufacturing system. ActiveMQ is Java-based.  In contrast, Starlink's telemetry data store uses Kafka, which is more complicated then ActiveMQ but scales more efficiently for large deployments.