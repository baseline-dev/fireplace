# Table keys

| pk                           | sk                           | gsi1pk           | gsi1sk         |
|------------------------------|------------------------------|------------------|----------------|
| #ACCOUNT{USERID}             | #ACCOUNT{USERID}             |                  |                |
| #EMAIL{EMAIL}                | #EMAIL{EMAIL}                |                  |                |
| #CHANGEEMAILREQUEST{HASH}    | #CHANGEEMAILREQUEST{HASH}    |                  |                |
| #CHANGEPASSWORDREQUEST{HASH} | #CHANGEPASSWORDREQUEST{HASH} |                  |                |
| #SESSION{HASH}               | #SESSION{HASH}               | #ACCOUNT{USERID} | #SESSION{HASH} | 