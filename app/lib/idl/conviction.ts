/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/conviction.json`.
 */
export type Conviction = {
  "address": "EWT7685cosRWNCgW6BeT8FqT68VTRQYmcHBNY6wNaNqh",
  "metadata": {
    "name": "conviction",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Path A mini-season — team vs team game (Stonk Battles) on ER/PER/VRF"
  },
  "instructions": [
    {
      "name": "callbackChaos",
      "discriminator": [
        254,
        183,
        221,
        67,
        162,
        0,
        104,
        204
      ],
      "accounts": [
        {
          "name": "vrfProgramIdentity",
          "docs": [
            "Scoped VRF identity PDA, bound to this program. Its presence as a signer proves",
            "the callback was issued by the VRF program for this program."
          ],
          "signer": true
        },
        {
          "name": "chaosEvent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  104,
                  97,
                  111,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "matchAccount"
              },
              {
                "kind": "arg",
                "path": "sequence"
              }
            ]
          }
        },
        {
          "name": "matchAccount",
          "docs": [
            "`Match.chaos_count` (P-D8 fix)."
          ],
          "writable": true
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "u32"
        },
        {
          "name": "sequence",
          "type": "u32"
        },
        {
          "name": "randomness",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "callbackVillain",
      "discriminator": [
        48,
        230,
        218,
        146,
        51,
        89,
        146,
        214
      ],
      "accounts": [
        {
          "name": "vrfProgramIdentity",
          "docs": [
            "Scoped VRF identity PDA, bound to this program. Its presence as a signer proves",
            "the callback was issued by the VRF program for this program."
          ],
          "signer": true
        },
        {
          "name": "villainPick",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  105,
                  108,
                  108,
                  97,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "matchAccount"
              }
            ]
          }
        },
        {
          "name": "matchAccount",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "u32"
        },
        {
          "name": "randomness",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "commitMatchState",
      "discriminator": [
        121,
        197,
        28,
        20,
        169,
        39,
        227,
        33
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "matchAccount",
          "writable": true
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createMatch",
      "discriminator": [
        107,
        2,
        184,
        145,
        70,
        142,
        17,
        165
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "matchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        },
        {
          "name": "roundCounter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  117,
                  110,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "u32"
        },
        {
          "name": "pot",
          "type": "u64"
        }
      ]
    },
    {
      "name": "delegateBasket",
      "discriminator": [
        196,
        119,
        186,
        43,
        197,
        234,
        15,
        178
      ],
      "accounts": [
        {
          "name": "player",
          "signer": true
        },
        {
          "name": "bufferBasket",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "basket"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                200,
                179,
                74,
                93,
                148,
                220,
                58,
                242,
                58,
                94,
                207,
                10,
                225,
                218,
                185,
                35,
                191,
                190,
                152,
                233,
                216,
                63,
                149,
                207,
                99,
                195,
                9,
                243,
                148,
                49,
                213,
                244
              ]
            }
          }
        },
        {
          "name": "delegationRecordBasket",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "basket"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataBasket",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "basket"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "basket",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  115,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "ownerProgram",
          "address": "EWT7685cosRWNCgW6BeT8FqT68VTRQYmcHBNY6wNaNqh"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "u32"
        },
        {
          "name": "side",
          "type": "u8"
        }
      ]
    },
    {
      "name": "delegateMatch",
      "discriminator": [
        30,
        116,
        9,
        69,
        147,
        61,
        133,
        238
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "bufferMatchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "matchAccount"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                200,
                179,
                74,
                93,
                148,
                220,
                58,
                242,
                58,
                94,
                207,
                10,
                225,
                218,
                185,
                35,
                191,
                190,
                152,
                233,
                216,
                63,
                149,
                207,
                99,
                195,
                9,
                243,
                148,
                49,
                213,
                244
              ]
            }
          }
        },
        {
          "name": "delegationRecordMatchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "matchAccount"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataMatchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "matchAccount"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "matchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        },
        {
          "name": "ownerProgram",
          "address": "EWT7685cosRWNCgW6BeT8FqT68VTRQYmcHBNY6wNaNqh"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "u32"
        }
      ]
    },
    {
      "name": "delegateStopLoss",
      "discriminator": [
        150,
        182,
        8,
        159,
        90,
        251,
        119,
        185
      ],
      "accounts": [
        {
          "name": "player",
          "signer": true
        },
        {
          "name": "bufferStopLoss",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "stopLoss"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                200,
                179,
                74,
                93,
                148,
                220,
                58,
                242,
                58,
                94,
                207,
                10,
                225,
                218,
                185,
                35,
                191,
                190,
                152,
                233,
                216,
                63,
                149,
                207,
                99,
                195,
                9,
                243,
                148,
                49,
                213,
                244
              ]
            }
          }
        },
        {
          "name": "delegationRecordStopLoss",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "stopLoss"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataStopLoss",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "stopLoss"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "stopLoss",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  111,
                  112,
                  45,
                  108,
                  111,
                  115,
                  115
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "ownerProgram",
          "address": "EWT7685cosRWNCgW6BeT8FqT68VTRQYmcHBNY6wNaNqh"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "u32"
        },
        {
          "name": "side",
          "type": "u8"
        }
      ]
    },
    {
      "name": "delegateTeam",
      "discriminator": [
        90,
        104,
        162,
        209,
        15,
        255,
        115,
        50
      ],
      "accounts": [
        {
          "name": "leader",
          "signer": true
        },
        {
          "name": "bufferTeam",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "team"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                200,
                179,
                74,
                93,
                148,
                220,
                58,
                242,
                58,
                94,
                207,
                10,
                225,
                218,
                185,
                35,
                191,
                190,
                152,
                233,
                216,
                63,
                149,
                207,
                99,
                195,
                9,
                243,
                148,
                49,
                213,
                244
              ]
            }
          }
        },
        {
          "name": "delegationRecordTeam",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "team"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataTeam",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "team"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "team",
          "writable": true
        },
        {
          "name": "ownerProgram",
          "address": "EWT7685cosRWNCgW6BeT8FqT68VTRQYmcHBNY6wNaNqh"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "u32"
        },
        {
          "name": "side",
          "type": "u8"
        }
      ]
    },
    {
      "name": "finalizeRound",
      "discriminator": [
        239,
        160,
        254,
        11,
        254,
        144,
        53,
        148
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "matchAccount",
          "writable": true
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "u32"
        }
      ]
    },
    {
      "name": "fold",
      "discriminator": [
        63,
        91,
        162,
        171,
        160,
        70,
        220,
        136
      ],
      "accounts": [
        {
          "name": "player",
          "signer": true
        },
        {
          "name": "matchAccount",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        },
        {
          "name": "team",
          "writable": true
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "u32"
        },
        {
          "name": "side",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initBasketPermission",
      "discriminator": [
        169,
        231,
        200,
        62,
        211,
        101,
        77,
        126
      ],
      "accounts": [
        {
          "name": "player",
          "signer": true
        },
        {
          "name": "basket",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  115,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "basket"
              }
            ]
          }
        },
        {
          "name": "permission",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "basket"
              }
            ],
            "program": {
              "kind": "account",
              "path": "permissionProgram"
            }
          }
        },
        {
          "name": "ephemeralVault",
          "writable": true,
          "address": "MagicVau1t999999999999999999999999999999999"
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "permissionProgram"
        }
      ],
      "args": []
    },
    {
      "name": "initConfig",
      "discriminator": [
        23,
        235,
        115,
        232,
        168,
        96,
        1,
        231
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "ftrAuthority",
          "docs": [
            "`init_ftr_mint` (separate instruction) using this key."
          ]
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "basePot",
          "type": "u64"
        },
        {
          "name": "roundDurationSecs",
          "type": "u32"
        },
        {
          "name": "chaosEventMax",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initFtrMint",
      "discriminator": [
        42,
        103,
        151,
        15,
        16,
        227,
        231,
        223
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "ftrAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  116,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "ftrMint",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "decimals",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initStopLossPermission",
      "discriminator": [
        35,
        197,
        82,
        69,
        101,
        153,
        62,
        201
      ],
      "accounts": [
        {
          "name": "player",
          "signer": true
        },
        {
          "name": "stopLoss",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  111,
                  112,
                  45,
                  108,
                  111,
                  115,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "stopLoss"
              }
            ]
          }
        },
        {
          "name": "permission",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "stopLoss"
              }
            ],
            "program": {
              "kind": "account",
              "path": "permissionProgram"
            }
          }
        },
        {
          "name": "ephemeralVault",
          "writable": true,
          "address": "MagicVau1t999999999999999999999999999999999"
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "permissionProgram"
        }
      ],
      "args": []
    },
    {
      "name": "leaveDuringLive",
      "discriminator": [
        138,
        170,
        121,
        215,
        126,
        79,
        5,
        10
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "matchAccount",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        },
        {
          "name": "team",
          "writable": true
        },
        {
          "name": "basket",
          "docs": [
            "Optional close: Basket PDA. When present, its lamports are",
            "refunded to `player` (P-D2 partial). When absent, the caller",
            "is leaving pre-lock-in (Basket PDA never existed)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  115,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "stopLoss",
          "docs": [
            "Optional close: StopLoss PDA. Same pattern as Basket."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  111,
                  112,
                  45,
                  108,
                  111,
                  115,
                  115
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "u32"
        },
        {
          "name": "side",
          "type": "u8"
        }
      ]
    },
    {
      "name": "leaveMatch",
      "discriminator": [
        199,
        14,
        16,
        91,
        104,
        95,
        166,
        15
      ],
      "accounts": [
        {
          "name": "player",
          "signer": true
        },
        {
          "name": "matchAccount",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        },
        {
          "name": "team",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "u32"
        },
        {
          "name": "side",
          "type": "u8"
        }
      ]
    },
    {
      "name": "lockInPreRound",
      "discriminator": [
        179,
        94,
        133,
        72,
        116,
        240,
        223,
        189
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "matchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        },
        {
          "name": "basket",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  115,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "stopLoss",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  111,
                  112,
                  45,
                  108,
                  111,
                  115,
                  115
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "entryPrices",
          "docs": [
            "D11: per-player entry-price snapshot. `init_if_needed` so re-locks",
            "don't reset the entry. The snapshot is taken from the current",
            "`match.last_prices_e6` (parallel array — slot N corresponds to",
            "basket slot N). On a fresh match where `last_prices_e6` is all zeros",
            "(no ticks yet), the entry snapshot is all zeros — `reveal_round`",
            "treats zero as \"stale\" and contributes 0 to weighted P&L.",
            "",
            "Seed mirrors Basket: `(match_id, player)` — `side` lives on the",
            "account data but isn't part of the seed because a player can only",
            "be on one side."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "u32"
        },
        {
          "name": "side",
          "type": "u8"
        },
        {
          "name": "mints",
          "type": {
            "array": [
              "pubkey",
              3
            ]
          }
        },
        {
          "name": "weights",
          "type": {
            "array": [
              "u16",
              3
            ]
          }
        },
        {
          "name": "range",
          "type": {
            "defined": {
              "name": "stopLossRange"
            }
          }
        },
        {
          "name": "perMemberPubkeys",
          "type": {
            "array": [
              "pubkey",
              8
            ]
          }
        },
        {
          "name": "perMemberFlags",
          "type": {
            "array": [
              "u8",
              8
            ]
          }
        },
        {
          "name": "perMemberCount",
          "type": "u8"
        }
      ]
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  110,
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  101,
                  45,
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "baseAccount"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                181,
                183,
                0,
                225,
                242,
                87,
                58,
                192,
                204,
                6,
                34,
                1,
                52,
                74,
                207,
                151,
                184,
                53,
                6,
                235,
                140,
                229,
                25,
                152,
                204,
                98,
                126,
                24,
                147,
                128,
                167,
                62
              ]
            }
          }
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "proposeParamChange",
      "discriminator": [
        83,
        77,
        9,
        159,
        203,
        217,
        134,
        156
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "proposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  112,
                  111,
                  115,
                  97,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "proposalId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "proposalId",
          "type": "u32"
        },
        {
          "name": "paramName",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "newValue",
          "type": "u32"
        }
      ]
    },
    {
      "name": "registerTeam",
      "discriminator": [
        12,
        29,
        209,
        52,
        168,
        44,
        109,
        66
      ],
      "accounts": [
        {
          "name": "leader",
          "writable": true,
          "signer": true
        },
        {
          "name": "matchAccount",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        },
        {
          "name": "team",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "u32"
        },
        {
          "name": "side",
          "type": "u8"
        },
        {
          "name": "members",
          "type": {
            "vec": {
              "defined": {
                "name": "teamMember"
              }
            }
          }
        }
      ]
    },
    {
      "name": "requestChaosVrf",
      "discriminator": [
        39,
        251,
        171,
        254,
        17,
        106,
        156,
        213
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "chaosEvent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  104,
                  97,
                  111,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "matchAccount"
              },
              {
                "kind": "arg",
                "path": "sequence"
              }
            ]
          }
        },
        {
          "name": "matchAccount",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        },
        {
          "name": "oracleQueue",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "programIdentity",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "vrfProgram",
          "address": "Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz"
        },
        {
          "name": "slotHashes",
          "address": "SysvarS1otHashes111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "u32"
        },
        {
          "name": "sequence",
          "type": "u32"
        }
      ]
    },
    {
      "name": "requestVillainVrf",
      "discriminator": [
        253,
        111,
        127,
        159,
        184,
        118,
        114,
        101
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "villainPick",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  105,
                  108,
                  108,
                  97,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "matchAccount"
              }
            ]
          }
        },
        {
          "name": "matchAccount",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        },
        {
          "name": "oracleQueue",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "programIdentity",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "vrfProgram",
          "address": "Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz"
        },
        {
          "name": "slotHashes",
          "address": "SysvarS1otHashes111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "u32"
        }
      ]
    },
    {
      "name": "revealRound",
      "discriminator": [
        146,
        249,
        2,
        210,
        169,
        145,
        120,
        6
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "matchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        },
        {
          "name": "team0"
        },
        {
          "name": "team1"
        },
        {
          "name": "ftrAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  116,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "ftrMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "u32"
        }
      ]
    },
    {
      "name": "tallyProposal",
      "discriminator": [
        20,
        91,
        72,
        31,
        245,
        129,
        245,
        40
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "proposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  112,
                  111,
                  115,
                  97,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "proposalId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "proposalId",
          "type": "u32"
        }
      ]
    },
    {
      "name": "tickPrice",
      "discriminator": [
        237,
        206,
        163,
        122,
        103,
        44,
        37,
        112
      ],
      "accounts": [
        {
          "name": "crank",
          "signer": true
        },
        {
          "name": "matchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "u32"
        },
        {
          "name": "mint",
          "type": "pubkey"
        },
        {
          "name": "priceE6",
          "type": "u64"
        }
      ]
    },
    {
      "name": "voteOnProposal",
      "discriminator": [
        188,
        239,
        13,
        88,
        119,
        199,
        251,
        119
      ],
      "accounts": [
        {
          "name": "voter",
          "signer": true
        },
        {
          "name": "ftrAccount"
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "proposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  112,
                  111,
                  115,
                  97,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "proposalId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "proposalId",
          "type": "u32"
        },
        {
          "name": "supportYes",
          "type": "bool"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "basket",
      "discriminator": [
        219,
        79,
        107,
        135,
        231,
        243,
        218,
        248
      ]
    },
    {
      "name": "chaosEvent",
      "discriminator": [
        248,
        210,
        149,
        16,
        167,
        133,
        212,
        221
      ]
    },
    {
      "name": "entryPrices",
      "discriminator": [
        157,
        155,
        70,
        13,
        78,
        59,
        209,
        154
      ]
    },
    {
      "name": "gameConfig",
      "discriminator": [
        45,
        146,
        146,
        33,
        170,
        69,
        96,
        133
      ]
    },
    {
      "name": "match",
      "discriminator": [
        236,
        63,
        169,
        38,
        15,
        56,
        196,
        162
      ]
    },
    {
      "name": "proposal",
      "discriminator": [
        26,
        94,
        189,
        187,
        116,
        136,
        53,
        33
      ]
    },
    {
      "name": "roundCounter",
      "discriminator": [
        244,
        2,
        165,
        240,
        168,
        10,
        1,
        238
      ]
    },
    {
      "name": "stopLoss",
      "discriminator": [
        251,
        211,
        91,
        132,
        59,
        107,
        142,
        94
      ]
    },
    {
      "name": "team",
      "discriminator": [
        140,
        218,
        177,
        140,
        193,
        241,
        199,
        106
      ]
    },
    {
      "name": "villainPick",
      "discriminator": [
        223,
        75,
        49,
        127,
        65,
        83,
        134,
        62
      ]
    }
  ],
  "events": [
    {
      "name": "chaosFired",
      "discriminator": [
        220,
        107,
        48,
        51,
        14,
        209,
        42,
        45
      ]
    },
    {
      "name": "lockedIn",
      "discriminator": [
        255,
        17,
        1,
        2,
        192,
        191,
        114,
        186
      ]
    },
    {
      "name": "matchCreated",
      "discriminator": [
        151,
        176,
        11,
        24,
        34,
        225,
        227,
        16
      ]
    },
    {
      "name": "priceTick",
      "discriminator": [
        223,
        42,
        8,
        135,
        176,
        150,
        240,
        142
      ]
    },
    {
      "name": "proposalOpened",
      "discriminator": [
        118,
        111,
        242,
        245,
        53,
        115,
        95,
        209
      ]
    },
    {
      "name": "proposalTallied",
      "discriminator": [
        160,
        131,
        90,
        39,
        14,
        222,
        55,
        56
      ]
    },
    {
      "name": "roundFinalized",
      "discriminator": [
        43,
        187,
        17,
        193,
        36,
        241,
        48,
        82
      ]
    },
    {
      "name": "roundRevealed",
      "discriminator": [
        99,
        213,
        118,
        5,
        55,
        211,
        57,
        71
      ]
    },
    {
      "name": "teamFolded",
      "discriminator": [
        124,
        142,
        112,
        155,
        138,
        83,
        29,
        73
      ]
    },
    {
      "name": "teamMemberLeft",
      "discriminator": [
        43,
        197,
        59,
        174,
        119,
        145,
        59,
        48
      ]
    },
    {
      "name": "teamRegistered",
      "discriminator": [
        34,
        196,
        222,
        157,
        183,
        10,
        215,
        104
      ]
    },
    {
      "name": "villainSelected",
      "discriminator": [
        1,
        162,
        177,
        70,
        21,
        24,
        181,
        46
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notPermitted",
      "msg": "Signer is not in the PER member set for this account"
    },
    {
      "code": 6001,
      "name": "notAuthority",
      "msg": "Authority must match the recorded authority"
    },
    {
      "code": 6002,
      "name": "stopLossTriggered",
      "msg": "StopLoss is in triggered state"
    },
    {
      "code": 6003,
      "name": "tooManyMembers",
      "msg": "Permission member count exceeds MAX_PERMISSION_MEMBERS"
    },
    {
      "code": 6004,
      "name": "matchNotLive",
      "msg": "Match is not in the Live phase"
    },
    {
      "code": 6005,
      "name": "invalidPhaseTransition",
      "msg": "Match phase transition is invalid"
    },
    {
      "code": 6006,
      "name": "villainAlreadyFulfilled",
      "msg": "Villain VRF already fulfilled"
    },
    {
      "code": 6007,
      "name": "chaosAlreadyFulfilled",
      "msg": "Chaos VRF already fulfilled for this sequence"
    },
    {
      "code": 6008,
      "name": "invalidOracleQueue",
      "msg": "Oracle queue is not a MagicBlock default queue"
    },
    {
      "code": 6009,
      "name": "ftrMintNotInitialized",
      "msg": "FTR mint not yet initialized"
    },
    {
      "code": 6010,
      "name": "matchNotDelegated",
      "msg": "Cannot reveal a match whose Match account is not delegated to ER"
    },
    {
      "code": 6011,
      "name": "overflow",
      "msg": "Arithmetic overflow in counter / accumulator"
    }
  ],
  "types": [
    {
      "name": "basket",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "u32"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "mints",
            "type": {
              "array": [
                "pubkey",
                3
              ]
            }
          },
          {
            "name": "weights",
            "type": {
              "array": [
                "u16",
                3
              ]
            }
          },
          {
            "name": "perMembers",
            "type": {
              "array": [
                "pubkey",
                8
              ]
            }
          },
          {
            "name": "perFlags",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "chaosEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "u32"
          },
          {
            "name": "sequence",
            "type": "u32"
          },
          {
            "name": "kind",
            "type": {
              "defined": {
                "name": "chaosKind"
              }
            }
          },
          {
            "name": "randomness",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "firedAtSlot",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "chaosFired",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "u32"
          },
          {
            "name": "sequence",
            "type": "u32"
          },
          {
            "name": "kind",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "chaosKind",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "rug"
          },
          {
            "name": "pump"
          },
          {
            "name": "fakeNews"
          }
        ]
      }
    },
    {
      "name": "entryPrices",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "u32"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "entryPricesE6",
            "docs": [
              "Per-slot entry price in e6-scaled USD, parallel to `Basket.mints`",
              "(and to `Match.last_prices_e6` / `Match.last_mint`). A slot that",
              "wasn't picked at lock-in keeps `0` and contributes 0 to the team's",
              "weighted P&L (matches the `teamPnlPercent` symmetry guard in",
              "`app/lib/pnl.ts`)."
            ],
            "type": {
              "array": [
                "u64",
                3
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "foldKind",
      "docs": [
        "Why a team folded — distinguishes voluntary quit from stop-loss trigger",
        "in the `TeamFolded` event so indexers / spectators can colour the feed",
        "differently."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "manual"
          },
          {
            "name": "stopLoss"
          }
        ]
      }
    },
    {
      "name": "gameConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "ftrAuthority",
            "type": "pubkey"
          },
          {
            "name": "ftrMint",
            "type": "pubkey"
          },
          {
            "name": "basePot",
            "type": "u64"
          },
          {
            "name": "roundDurationSecs",
            "type": "u32"
          },
          {
            "name": "chaosEventMax",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "lockedIn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "u32"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "mints",
            "type": {
              "array": [
                "pubkey",
                3
              ]
            }
          },
          {
            "name": "weights",
            "type": {
              "array": [
                "u16",
                3
              ]
            }
          }
        ]
      }
    },
    {
      "name": "match",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "u32"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "teams",
            "type": {
              "array": [
                "pubkey",
                2
              ]
            }
          },
          {
            "name": "pot",
            "type": "u64"
          },
          {
            "name": "phase",
            "type": {
              "defined": {
                "name": "matchPhase"
              }
            }
          },
          {
            "name": "deadlineSlot",
            "type": "u64"
          },
          {
            "name": "villainPubkey",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "chaosCount",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "lastPricesE6",
            "docs": [
              "Latest observed price (e6) per basket slot. See file-level note."
            ],
            "type": {
              "array": [
                "u64",
                3
              ]
            }
          },
          {
            "name": "lastMint",
            "docs": [
              "Mint pubkey last reported for each basket slot. Parallel to",
              "`last_prices_e6` so `reveal_round` can resolve basket mints ↔",
              "latest prices without a client-side mint map (P-B1 fix)."
            ],
            "type": {
              "array": [
                "pubkey",
                3
              ]
            }
          }
        ]
      }
    },
    {
      "name": "matchCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "u32"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "pot",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "matchPhase",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "created"
          },
          {
            "name": "lockedIn"
          },
          {
            "name": "live"
          },
          {
            "name": "revealed"
          },
          {
            "name": "finalized"
          }
        ]
      }
    },
    {
      "name": "priceTick",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "u32"
          },
          {
            "name": "slot",
            "type": "u8"
          },
          {
            "name": "priceE6",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "proposal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proposalId",
            "type": "u32"
          },
          {
            "name": "proposer",
            "type": "pubkey"
          },
          {
            "name": "paramName",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "newValue",
            "type": "u32"
          },
          {
            "name": "ftrYes",
            "type": "u64"
          },
          {
            "name": "ftrNo",
            "type": "u64"
          },
          {
            "name": "deadlineSlot",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "proposalStatus"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "proposalOpened",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proposalId",
            "type": "u32"
          },
          {
            "name": "proposer",
            "type": "pubkey"
          },
          {
            "name": "paramName",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "proposalStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "tallied"
          }
        ]
      }
    },
    {
      "name": "proposalTallied",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proposalId",
            "type": "u32"
          },
          {
            "name": "ftrYes",
            "type": "u64"
          },
          {
            "name": "ftrNo",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "roundCounter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "currentRound",
            "type": "u32"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "roundFinalized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "roundRevealed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "u32"
          },
          {
            "name": "winnerSide",
            "type": "u8"
          },
          {
            "name": "ftrMinted",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "stopLoss",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "u32"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "basketPda",
            "type": "pubkey"
          },
          {
            "name": "range",
            "type": {
              "defined": {
                "name": "stopLossRange"
              }
            }
          },
          {
            "name": "hit",
            "type": "u8"
          },
          {
            "name": "perMembers",
            "type": {
              "array": [
                "pubkey",
                8
              ]
            }
          },
          {
            "name": "perFlags",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "stopLossRange",
      "docs": [
        "Signed stop-loss band — `min_bps` is the floor (most-negative loss tolerable),",
        "`max_bps` is the edge (least-negative loss tolerable).",
        "",
        "The UI models these as negative values (e.g. `minBps: -1500` means \"stop when",
        "loss exceeds 15%\"). Signed `i16` is required so Borsh accepts the negative",
        "inputs at the serializer boundary (Borsh rejects negative values for `u16`)."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minBps",
            "type": "i16"
          },
          {
            "name": "maxBps",
            "type": "i16"
          }
        ]
      }
    },
    {
      "name": "team",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "u32"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "leader",
            "type": "pubkey"
          },
          {
            "name": "members",
            "type": {
              "vec": {
                "defined": {
                  "name": "teamMember"
                }
              }
            }
          },
          {
            "name": "score",
            "type": "u64"
          },
          {
            "name": "alive",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "folded",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "teamFolded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "u32"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "by",
            "type": "pubkey"
          },
          {
            "name": "kind",
            "type": {
              "defined": {
                "name": "foldKind"
              }
            }
          }
        ]
      }
    },
    {
      "name": "teamMember",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "basketPda",
            "type": "pubkey"
          },
          {
            "name": "stopLossPda",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "teamMemberLeft",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "u32"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "player",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "teamRegistered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "u32"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "leader",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "villainPick",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "u32"
          },
          {
            "name": "randomness",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "villainMint",
            "type": "pubkey"
          },
          {
            "name": "fulfilledAtSlot",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "villainSelected",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "u32"
          },
          {
            "name": "mint",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
