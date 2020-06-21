aws dynamodb create-table \
             --endpoint-url http://localhost:8000 \
             --table-name Fireplace \
             --attribute-definitions \
                 AttributeName=pk,AttributeType=S \
                 AttributeName=sk,AttributeType=S \
                 AttributeName=gsi1pk,AttributeType=S \
                 AttributeName=gsi1sk,AttributeType=S \
             --key-schema \
                 AttributeName=pk,KeyType=HASH \
                 AttributeName=sk,KeyType=RANGE \
             --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
             --global-secondary-indexes IndexName=gsi1,\
KeySchema=["{AttributeName=gsi1pk,KeyType=HASH}","{AttributeName=gsi1sk,KeyType=RANGE}"],\
Projection="{ProjectionType=ALL}",\
ProvisionedThroughput="{ReadCapacityUnits=5,WriteCapacityUnits=5}"