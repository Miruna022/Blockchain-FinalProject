module bridge::bridge {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::event;

    // The Token Name
    public struct BRIDGE has drop {}

    // The Vault to hold SUI 
    public struct Vault has key {
        id: UID,
        sui_balance: Balance<SUI>,
    }

    // Events
    public struct BridgeToEthEvent has copy, drop {
        sender: address,
        amount: u64,
    }

    fun init(witness: BRIDGE, ctx: &mut TxContext) {
        // create coin
        let (treasury, metadata) = coin::create_currency(
            witness, 
            9, 
            b"IBT", 
            b"Bridge Token", 
            b"Bridge Token", 
            option::none(), 
            ctx
        );

        // create vault
        transfer::share_object(Vault {
            id: object::new(ctx),
            sui_balance: balance::zero(),
        });

        // publicize metadata
        transfer::public_freeze_object(metadata);

        // Give ME the Admin Key
        transfer::public_transfer(treasury, ctx.sender());
    }

    // ADMIN ONLY: mint IBT to a user (Eth -> Sui)
    public entry fun mint_ibt(
        cap: &mut TreasuryCap<BRIDGE>, 
        amount: u64, 
        recipient: address, 
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(cap, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    // USER FUNCTION: burn IBT to go back to Eth (Sui -> Eth)
    public entry fun burn_ibt(
        cap: &mut TreasuryCap<BRIDGE>, 
        coin: Coin<BRIDGE>,
        ctx: &mut TxContext
    ) {
        let amount = coin::value(&coin);
        let sender = ctx.sender();

        // Burn the coin (Destroy it)
        coin::burn(cap, coin);

        // Emit event for the bridge server
        event::emit(BridgeToEthEvent {
            sender,
            amount
        });
    }
}