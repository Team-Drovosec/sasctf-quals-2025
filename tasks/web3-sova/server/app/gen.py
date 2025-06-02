import string
import sys
from elftools.elf.elffile import ELFFile
from capstone import Cs, CS_ARCH_RISCV, CS_MODE_RISCV64, CS_MODE_LITTLE_ENDIAN, CS_OP_REG, CS_OP_IMM, CS_OP_MEM

mem_size = 0x4

read_reg = '''let _sw_reg{index}:= add(_sw_regs, mul(and(_sw_data, 255),32))
                    _sw_data := sar(8, _sw_data)'''


save_mem = '''let _sw_mem_addr := add(_sw_mem,add(mload(_sw_reg2),_sw_data))
                    let _sw_mem_value := and(mload(_sw_mem_addr),{mask})
                    _sw_mem_value := or(shl({shift},mload(_sw_reg1)),_sw_mem_value)
                    mstore(_sw_mem_addr,_sw_mem_value)'''

load_mem = '''let _sw_mem_addr := add(_sw_mem,add(mload(_sw_reg2),_sw_data))
                    mstore(_sw_reg1,s{op}r({shift},mload(_sw_mem_addr)))'''

load_value = '''s{op}r({shift},shl({shift},mload(_sw_reg{index})))'''


def _save_mem(size):
    shift = 256 - size
    mask = (1<<shift) - 1
    return save_mem.format(shift = shift, mask = mask)

def _load_mem(size,sign):
    shift = 256 - size
    return load_mem.format(shift = shift, op = 'a' if sign else 'h')

def _load_value(index,size,sign):
    shift = 256 - size
    return load_value.format(index = index, shift = shift, op = 'a' if sign else 'h')

solidity = """pragma solidity ^0.8.20;

contract VMX{
{%vars%}

    function validate(string calldata _sw_key) view external returns (
        uint256[{%regs_size%}] memory _sw_regs,
        uint256[{%mem_size%}] memory _sw_mem) {

        uint256 _sw_len = bytes(_sw_key).length;        
        uint256 _sw_offset = {%mem_size%}*32 - _sw_len;
        _sw_regs[{%sp_index%}] = _sw_offset;
        _sw_regs[{%a0_index%}] = _sw_offset;
        _sw_regs[{%a1_index%}] = _sw_len;

        assembly {
            let _sw_dst := add(_sw_mem, _sw_offset)

            for { let _sw_i := 0 } lt(_sw_i, _sw_len) { _sw_i := add(_sw_i, 32) } {
                mstore(add(_sw_dst, _sw_i), calldataload(add(_sw_key.offset, _sw_i)))
            }

            for { let _sw_i := 0 } 1 { _sw_i := add(_sw_i, 1) } {
                let _sw_data := sload(_sw_i)
                
                let _sw_op := and(_sw_data, 255)
                _sw_data := sar(8, _sw_data)

                switch _sw_op
                case 1 {//addi
                    {%read_reg1%}
                    {%read_reg2%}
                    mstore(_sw_reg1,add(sar(196,shl(196,_sw_data)),mload(_sw_reg2)))
                }
                case 2 {//sd
                    {%read_reg1%}
                    {%read_reg2%}
                    {%save_mem_d%}
                }
                case 3 {//lui
                    {%read_reg1%}
                    mstore(_sw_reg1,sar(224,shl(236,_sw_data)))
                }
                case 4 {//add
                    {%read_reg1%}
                    {%read_reg2%}
                    {%read_reg3%}
                    mstore(_sw_reg1,add(mload(_sw_reg2),mload(_sw_reg3)))
                }
                case 5 {//sw
                    {%read_reg1%}
                    {%read_reg2%}
                    {%save_mem_w%}
                }
                case 6 {//j
                    _sw_i := add(_sw_i,_sw_data)
                }
                case 7 {//lw
                    {%read_reg1%}
                    {%read_reg2%}
                    {%load_mem_w%}
                }
                case 8 {//slli
                    {%read_reg1%}
                    {%read_reg2%}
                    mstore(_sw_reg1,shl(_sw_data,mload(_sw_reg2)))
                }
                case 9 {//ld
                    {%read_reg1%}
                    {%read_reg2%}
                    {%load_mem_d%}
                }
                case 10 {//bgez
                    {%read_reg1%}
                    if iszero(slt(mload(_sw_reg1),0)) {
                        _sw_i := add(_sw_i,_sw_data)
                    }
                }
                case 11 {//xor
                    {%read_reg1%}
                    {%read_reg2%}
                    {%read_reg3%}
                    mstore(_sw_reg1,xor(mload(_sw_reg2),mload(_sw_reg3)))
                }
                case 12 {//addiw
                    {%read_reg1%}
                    {%read_reg2%}

                    mstore(_sw_reg1,add(sar(224,shl(224,_sw_data)),mload(_sw_reg2)))
                }
                case 13 {//sext.w
                    {%read_reg1%}
                    {%read_reg2%}
                    mstore(_sw_reg1,{%load_value32s_reg2%})
                }
                case 14 {//bge
                    {%read_reg1%}
                    {%read_reg2%}
                    if iszero(slt(mload(_sw_reg1), mload(_sw_reg2))) {
                        _sw_i := add(_sw_i,_sw_data)
                    }
                }
                case 15 {//srli
                    {%read_reg1%}
                    {%read_reg2%}
                    mstore(_sw_reg1,shr(_sw_data,mload(_sw_reg2)))
                }
                case 16 {//andi
                    {%read_reg1%}
                    {%read_reg2%}
                    mstore(_sw_reg1,and(_sw_data,mload(_sw_reg2)))
                }
                case 17 {//lbu
                    {%read_reg1%}
                    {%read_reg2%}
                    {%load_mem_ub%}
                }
                case 18 {//sb
                    {%read_reg1%}
                    {%read_reg2%}
                    {%save_mem_b%}
                }
                case 19 {//bnez
                    {%read_reg1%}
                    if mload(_sw_reg1) {
                        _sw_i := add(_sw_i,_sw_data)
                    }
                }
                case 20 {//mv
                    {%read_reg1%}
                    {%read_reg2%}
                    mstore(_sw_reg1,mload(_sw_reg2))
                }
                case 21 {//ret
                    break
                }
                case 22 {//bgeu
                    {%read_reg1%}
                    {%read_reg2%}
                    if iszero(lt(mload(_sw_reg1), mload(_sw_reg2))) {
                        _sw_i := add(_sw_i,_sw_data)
                    }
                }
                case 23 {//slliw
                    {%read_reg1%}
                    {%read_reg2%}
                    mstore(_sw_reg1,shl(_sw_data,{%load_value32s_reg2%}))
                }
                case 24 {//sll
                    {%read_reg1%}
                    {%read_reg2%}
                    {%read_reg3%}
                    mstore(_sw_reg1,shl(mload(_sw_reg3),mload(_sw_reg2)))
                }
                case 25 {//or
                    {%read_reg1%}
                    {%read_reg2%}
                    {%read_reg3%}
                    mstore(_sw_reg1,or(mload(_sw_reg2),mload(_sw_reg3)))
                }
                case 26 {//bltu
                    {%read_reg1%}
                    {%read_reg2%}
                    if lt(mload(_sw_reg1), mload(_sw_reg2)) {
                        _sw_i := add(_sw_i,_sw_data)
                    }
                }
                case 27 {//srliw
                    {%read_reg1%}
                    {%read_reg2%}
                    mstore(_sw_reg1,shr(_sw_data,{%load_value32u_reg2%}))
                }
                case 28 {//mulw
                    {%read_reg1%}
                    {%read_reg2%}
                    mstore(_sw_reg1,mul({%load_value32s_reg1%},{%load_value32s_reg2%}))
                }
                case 29 {//lwu
                    {%read_reg1%}
                    {%read_reg2%}
                    {%load_mem_uw%}
                }
                default{ revert(0,0) }
            }
        }

        require(_sw_regs[{%a0_index%}] == {%serial%});
    }
}
"""

op_map = {
    'addi':1,
    'sd':2,
    'lui':3,
    'add':4,
    'sw':5,
    'j':6,
    'lw':7,
    'slli':8,
    'ld':9,
    'bgez':10,
    'xor':11,
    'addiw':12,
    'sext.w':13,
    'bge':14,
    'srli':15,
    'andi':16,
    'lbu':17,
    'sb':18,
    'bnez':19,
    'mv':20,
    'ret':21,
    'bgeu':22,
    'slliw':23,
    'sll':24,
    'or':25,
    'bltu':26,
    'srliw':27,
    'mulw':28,
    'lwu':29
}

jump_codes = {'bgez','bnez','bge','j','bgeu','bltu'}

with open(sys.argv[1], "rb") as f:
    elf = ELFFile(f)

    text_section = elf.get_section_by_name('.text')
    code = text_section.data()
    text_base = text_section['sh_addr']

    symtab = elf.get_section_by_name('.symtab')
    if not symtab:
        print("No symbol table found.")
        exit(1)

    md = Cs(CS_ARCH_RISCV, CS_MODE_RISCV64 | CS_MODE_LITTLE_ENDIAN)
    md.skipdata = True
    md.detail = True
    
    _vars = list()
    _max_regs_index = 0
    prev = None

    for symbol in symtab.iter_symbols():
        if symbol.name == "reversible_transform":
            func_addr = symbol['st_value']
            func_size = symbol['st_size']
            offset = func_addr - text_base
            func_code = code[offset : offset + func_size]

            print(f"\nFunction {symbol.name} @ 0x{func_addr:08x}, size={func_size}")
            for instr in md.disasm(func_code, func_addr):
                print(f"0x{instr.address:08x}:\t{instr.mnemonic:8s} {instr.op_str}")
                
                assert prev == None or instr.address - prev == 4                    
                prev = instr.address
                
                if instr.mnemonic not in op_map:
                    raise Exception(instr.mnemonic)
                    
                
                value = op_map[instr.mnemonic]
                shift = 8


                term = False
                for op in instr.operands:
                    assert not term
                    if op.type == CS_OP_REG:
                        value |= op.reg << shift
                        shift += 8
                        
                        _max_regs_index = max(_max_regs_index,op.reg)
                        print("  REG:", instr.reg_name(op.reg))
                        
                    elif op.type == CS_OP_IMM:
                        imm = op.imm
                    
                        if instr.mnemonic in jump_codes:
                            assert imm % 4 == 0
                            imm //= 4
                            imm -= 1
                    
                        value |= (2**256 + imm) << shift
                        print("  IMM:", imm)
                        term = True
                    elif op.type == CS_OP_MEM:
                        assert instr.mnemonic not in jump_codes
                    
                        value |= op.mem.base << shift
                        shift += 8
                        value |= (2**256 + op.mem.disp) << shift
                        
                        _max_regs_index = max(_max_regs_index,op.mem.base)
                        print("  MEM:")
                        print("    base:", instr.reg_name(op.mem.base))
                        print("    disp:", op.mem.disp)
                        term = True
                    else:
                        raise Exception()
                        
                value &= 2**256 - 1
                _vars.append(f"    uint256 private _sw_var_{len(_vars)} = 0x{value:064x};")

    regs = dict()
    i = 1
    while True:
        name = md.reg_name(i)
        if not name:
            break
        regs[name] = i
        i += 1

    
    solidity = solidity.replace("{%read_reg1%}",read_reg.format(index = "1"))
    solidity = solidity.replace("{%read_reg2%}",read_reg.format(index = "2"))
    solidity = solidity.replace("{%read_reg3%}",read_reg.format(index = "3"))
    solidity = solidity.replace("{%mem_size%}",str(mem_size))
    solidity = solidity.replace("{%regs_size%}",str(_max_regs_index + 1))

    for k,v in regs.items():
        solidity = solidity.replace("{%" + k + "_index%}",str(v))

    solidity = solidity.replace("{%save_mem_b%}",_save_mem(8))
    solidity = solidity.replace("{%save_mem_w%}",_save_mem(32))
    solidity = solidity.replace("{%save_mem_d%}",_save_mem(64))

    solidity = solidity.replace("{%load_mem_ub%}",_load_mem(8,False))
    solidity = solidity.replace("{%load_mem_d%}",_load_mem(64,True))
    solidity = solidity.replace("{%load_mem_w%}",_load_mem(32,True))
    solidity = solidity.replace("{%load_mem_uw%}",_load_mem(32,False))


    solidity = solidity.replace("{%load_value32s_reg1%}",_load_value(1,32,True)) 
    solidity = solidity.replace("{%load_value32s_reg2%}",_load_value(2,32,True))
    solidity = solidity.replace("{%load_value32u_reg2%}",_load_value(2,32,False))

    solidity = solidity.replace("{%serial%}",sys.argv[2].strip())

    solidity = solidity.replace("{%vars%}",'\n'.join(_vars))

    with open("reg_info.txt","w") as f:
        for k,v in regs.items():
            f.write(f"{k} : {v}\n")

    with open("contract.sol","w") as f:
        f.write(solidity)
       
