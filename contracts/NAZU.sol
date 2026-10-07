// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * NAZU Token
 * Fixed supply ERC-20 token.
 *
 * Name: NAZU
 * Symbol: NAZU
 * Total supply: 21,000,000 NAZU
 *
 * The full supply is minted once to the deployer.
 * No public mint function exists, so the supply cannot be increased
 * through this contract after deployment.
 */
contract NAZU {
    string public constant name = "NAZU";
    string public constant symbol = "NAZU";
    uint8 public constant decimals = 18;
    uint256 public constant totalSupply = 21_000_000 * 10 ** 18;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        _balances[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = _allowances[from][msg.sender];
        require(allowed >= amount, "NAZU: insufficient allowance");

        if (allowed != type(uint256).max) {
            _allowances[from][msg.sender] = allowed - amount;
        }

        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "NAZU: zero recipient");
        require(_balances[from] >= amount, "NAZU: insufficient balance");

        unchecked {
            _balances[from] -= amount;
            _balances[to] += amount;
        }

        emit Transfer(from, to, amount);
    }
}
