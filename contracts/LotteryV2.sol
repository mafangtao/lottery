pragma solidity >=0.6.0;

import "@openzeppelin/upgrades-core/contracts/Initializable.sol";
contract LotteryV2 is Initializable {

    uint public firstPrizeMaxAmount;
    uint public secondPrizeMaxAmount;
    uint public minAmount;

    // prize total supply
    uint public total;


    event Win(address indexed user, uint indexed lotNumber, uint indexed level, uint amount);
    event Lost(address indexed user, uint indexed lotNumber);
    function initialize() initializer public {

        firstPrizeMaxAmount = 500*10**18;
        secondPrizeMaxAmount = 5*10**18;
        minAmount = 1*10**18;
    }

    function lotNumber() private view returns (uint) {
        return uint(keccak256(abi.encodePacked(block.timestamp, block.difficulty))) % 10000;
    }

    function bet(uint _placeNumber) public payable{
        require(msg.value == minAmount, "invalid bet amount!");
        require(_placeNumber > 0 && _placeNumber < 10000, "invalid place number!");
        total += msg.value;
        uint _lotNumber = lotNumber();
        if(_placeNumber == _lotNumber){
            //firstPrize
            uint _winAmount = total > firstPrizeMaxAmount ? firstPrizeMaxAmount:total;
            msg.sender.transfer(_winAmount);
            total-=_winAmount;
            emit Win(msg.sender,_lotNumber,1,_winAmount);
        }else{
            uint[2] memory _placePatterns = [_placeNumber%1000, _placeNumber/10];
            uint[2] memory _lotPatterns = [_lotNumber%1000, _lotNumber/10];
            bool _isWin = false;
            for(uint i=0;i<_placePatterns.length;i++){
                if(_isWin)break;
                for(uint j=0;j<_lotPatterns.length;j++){
                    if(_isWin)break;
                    if(_placePatterns[i] == _lotPatterns[j])
                        _isWin = true;
                }
            }
            if(_isWin){
                //secondPrize
                uint _winAmount = total > secondPrizeMaxAmount ? secondPrizeMaxAmount:total;
                msg.sender.transfer(_winAmount);
                total-=_winAmount;
                emit Win(msg.sender,_lotNumber,2,_winAmount);

            }else{
                //no award
                emit Lost(msg.sender,_lotNumber);
            }
        }
    }

    //test for upgrade function
    function resetMinAmount(uint _minAmount) public {
        minAmount = _minAmount * 10**18;
    }

 }
