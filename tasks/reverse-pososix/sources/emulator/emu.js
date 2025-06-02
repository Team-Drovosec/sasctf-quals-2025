import * as riscv_math from "./math.js"

export class Emulator {
    constructor(write_callback, read_callback, keyboard_callback, ram_image_offset = 0x80000000, ram_size = 16 * 1024 * 1024) {
        this.registers = new Uint32Array(32);
        this.registers.fill(0);

        this.pc = 0x0;
        this.cyclel = 0x0;
        this.cycleh = 0x0;
        this.timerl = 0x0;
        this.timerh = 0x0;
        this.timermatchl = 0x0;
        this.timermatchh = 0x0;
        this.extraflags = 0x0;
        this.mstatus = 0x0;
        this.mie = 0x0;
        this.mtvec = 0x0;
        this.mepc = 0x0;
        this.mcause = 0x0;
        this.mip = 0x0;
        this.mscratch = 0x0;
        this.mtval = 0x0;
        
        this.RAM_IMAGE_OFFSET = ram_image_offset;
        this.RAM_SIZE = ram_size;

        this.ram = new DataView(new ArrayBuffer(this.RAM_SIZE));
        this.little_endian = true;
        this.dtb_ptr = 0x0;

        this.debug = false;
        this.fixed_update = false;

        // callbacks
        this.write = write_callback;
        this.read = read_callback;
        this.keyboardCallback = keyboard_callback;
        this.isRunning = false;
        this.executionQueue = null;
        this.insn_per_frame = 8192 * 2;
    }

    load1(offset) {
        return this.ram.getUint8(offset);
    }

    load2(offset) {
        return this.ram.getUint16(offset, this.little_endian);
    }

    load4(offset) {
        return this.ram.getUint32(offset, this.little_endian);
    }
    
    load1_signed(offset) {
        return this.ram.getInt8(offset);
    }

    load2_signed(offset) {
        return this.ram.getInt16(offset, this.little_endian);
    }

    store1(offset, val) {
        this.ram.setUint8(offset, val & 0xff);
    }

    store2(offset, val) {
        this.ram.setUint16(offset, val & 0xffff, this.little_endian);
    }

    store4(offset, val) {
        this.ram.setUint32(offset, val, this.little_endian);
    }

    reset() {
        this.registers.fill(0);
        this.pc = 0;
    }

    MMIORange(p) {
        return (riscv_math.rv_unsigned_ge(p, 0x10000000) && riscv_math.rv_unsigned_lt(p, 0x12000000));
    }

    handleException(pc, ir, trap) {
        return trap;
    }
    
    postexec(pc, ir, trap) {
        if (trap > 0) {
            trap = this.handleException(pc, ir, trap);
        }

        return trap;
    }

    handle_mem_load_control(addy) {
        let rval = 0;
        if (addy == 0x1100bffc) {
            return this.timerh;
        }
        else if (addy == 0x1100bff8) {
            return this.timerl;
        }
        else if (addy == 0x10000005) {
            return 0x60 | this.keyboardCallback();
        }
        else if (addy == 0x10000000 && this.keyboardCallback()) {
            return this.read();
        }

        return 0;
    }

    otherscr_write(csrno, value) {
        if (csrno === 0x136) {
            this.write(value.toString());
        } 
        else if (csrno === 0x137) {
            this.write(value.toString(16).padStart(8, '0'));
        }
        else if (csrno === 0x138) {
            const ptrstart = riscv_math.rv_unsigned_sub(value, this.RAM_IMAGE_OFFSET);
            let ptrend = ptrstart;

            if (ptrstart >= this.RAM_SIZE) {
                throw new Error(`DEBUG PASSED INVALID PTR (${value.toString(16).padStart(8, '0')})`);
            } 
            else {
                while (ptrend < this.RAM_SIZE) {
                    if (this.ram.getUint8(ptrend) === 0) {
                        break;
                    }

                    ptrend++;
                }

                if (ptrend !== ptrstart) {
                    this.write(Buffer.from(strBuf));
                }
            }
        }
        else if (csrno === 0x139) {
            this.write(String.fromCharCode(value & 0xFF));
        }
    }

    otherscr_read(csrno) {
        csrno = csrno & 0xFFFF;

        if (csrno === 0x140) {
            if (!this.keyboardCallback()) {
                return -1;
            }

            return this.read() & 0xFF;
        }

        return 0;
    }

    async loadEverything() {
        const dtb = await fetch('/funny/pososix/dtb.img')
        const dtbBuffer = new DataView(await dtb.arrayBuffer())
        const kernel = await fetch('/funny/pososix/image.img')
        const kernelBuffer = new DataView(await kernel.arrayBuffer())
        this.loadDTB(dtbBuffer)
        this.loadKernelImage(kernelBuffer)
    }

    loadDTB(dtb) {
        let dtb_ptr = this.RAM_SIZE - dtb.byteLength - 192;
        for (let i = 0; i < dtb.byteLength; i++) {
            this.ram.setUint8(dtb_ptr + i, dtb.getUint8(i));
        }

        this.dtb_ptr = dtb_ptr;
    }

    loadKernelImage(kernel) {
        let linux_ptr = 0;
        for (let i = 0; i < kernel.byteLength; i++) {
            this.ram.setUint8(linux_ptr + i, kernel.getUint8(i));
        }

        let dtb_ram = this.ram.getUint32(this.dtb_ptr + 0x13c, this.little_endian);
        if (dtb_ram == 0x00c0ff03) {
            let valid_ram = this.dtb_ptr;
            dtb_ram = (valid_ram >>> 24) | (((valid_ram >>> 16) & 0xff) << 8) | (((valid_ram >>> 8) & 0xff) << 16) | ((valid_ram & 0xff) << 16);
            dtb_ram = dtb_ram;
            this.ram.setUint32(this.dtb_ptr + 0x13c, dtb_ram, this.little_endian);
        }
    }

    step(elapsedUs, count) {
        let new_timer = riscv_math.rv_unsigned_add(this.timerl, elapsedUs);

        if (riscv_math.rv_unsigned_lt(new_timer, this.timerl)) {
            this.timerh = riscv_math.rv_unsigned_add(this.timerh, 1);
        }

        this.timerl = new_timer;

        const timer_expired = (this.timerh > this.timermatchh ) || (this.timerh == this.timermatchh && this.timerl > this.timermatchl);
        const match_active = this.timermatchh != 0 || this.timermatchl != 0;

        if (timer_expired && match_active) {
            this.extraflags &= ~4;
            this.mip |= (1 << 7);
        }
        else {
            this.mip &= ~(1 << 7);
        }

        if (this.extraflags & 4) {
            return 1;
        }

        let trap = 0;
        let cycle = this.cyclel;
        let ret = 0;
        let pc = this.pc;

        if (( this.mip & (1 << 7) ) && ( this.mie & (1 << 7) ) && ( this.mstatus & 0x8) ) {
            trap = 0x80000007;
            pc = riscv_math.rv_unsigned_sub(pc, 4);
        }
        else
        for (let icount = 0; icount < count; icount++) {
            let ir = 0;
            let rval = 0;
            cycle = riscv_math.rv_unsigned_add(cycle, 1);
            let ofs_pc = pc - this.RAM_IMAGE_OFFSET;
            let rs1 = 0;
            let rs2 = 0;
            let imm = 0;
            let imm_se = 0;
            let immm4 = 0;
            let rsval = 0;

            if (riscv_math.rv_unsigned_ge(ofs_pc, this.RAM_SIZE)) {
                trap = 1 + 1;
                break;
            }
            else if (ofs_pc & 3) {
                trap = 1 + 0;
                break;
            }
            else {
                ir = this.load4(ofs_pc);
                let rdid = (ir >> 7) & 0x1f;

                switch(ir & 0x7f) {
                    case 0x37:
                        rval = ((ir & 0xfffff000)) >>> 0;
                        break;
        
                    case 0x17:
                        rval = (pc + (ir & 0xfffff000)) >>> 0;
                        break;
        
                    case 0x6F:
                        let reladdy = ((ir & 0x80000000) >> 11) | ((ir & 0x7fe00000) >> 20) | ((ir & 0x00100000) >> 9) | ((ir & 0x000ff000));
                        reladdy |= 0;
                        if (reladdy & 0x00100000) {
                            reladdy |= 0xffe00000;
                        }
                    
                        rval = (pc + 4);
                        pc = (pc + reladdy - 4);
                        break;
        
                    case 0x67:
                        imm = ir >>> 20;
                        imm_se = (imm | ((imm & 0x800) ? 0xfffff000 : 0)) | 0;
                        rval = pc + 4;
                        pc = riscv_math.rv_unsigned_sub(((this.registers[(ir >>> 15) & 0x1f] + imm_se) & ~1), 4);
                        break;
        
                    case 0x63:
                        immm4 = ((ir & 0xf00) >>> 7) | ((ir & 0x7e000000) >>> 20) | ((ir & 0x80) << 4) | ((ir >>> 31) << 12);

                        if (immm4 & 0x1000) {
                            immm4 |= 0xffffe000;
                        }

                        rs1 = this.registers[(ir >>> 15) & 0x1f] | 0;
                        rs2 = this.registers[(ir >>> 20) & 0x1f] | 0;

                        immm4 = pc + riscv_math.rv_unsigned_sub(immm4, 4);
                        rdid = 0;

                        switch ((ir >>> 12) & 0x7) {
                            case 0:  // BEQ
                                if (rs1 === rs2) pc = immm4; break;
                            case 1:  // BNE
                                if (rs1 !== rs2) pc = immm4; break;
                            case 4:  // BLT
                                if (rs1 < rs2) pc = immm4; break;
                            case 5:  // BGE
                                if (rs1 >= rs2) pc = immm4; break;
                            case 6:  // BLTU
                                if (riscv_math.rv_unsigned_lt(rs1, rs2)) pc = immm4; break;
                            case 7:  // BGEU
                                if (riscv_math.rv_unsigned_ge(rs1, rs2)) pc = immm4; break;
                            default:
                                trap = 2 + 1;  // Illegal instruction trap
                                break;
                        }
                        break;
        
                    case 0x03:
                        rs1 = this.registers[(ir >>> 15) & 0x1f];
                        imm = ir >>> 20;
                        imm_se = (imm | ((imm & 0x800) ? 0xfffff000 : 0)) | 0;

                        rsval = riscv_math.rv_unsigned_add(rs1, imm_se);
                        rsval = riscv_math.rv_unsigned_sub(rsval, this.RAM_IMAGE_OFFSET);

                        if (riscv_math.rv_unsigned_ge(rsval, riscv_math.rv_unsigned_sub(this.RAM_SIZE, 3))) {
                            rsval = riscv_math.rv_unsigned_add(rsval, this.RAM_IMAGE_OFFSET);
                            if (this.MMIORange(rsval)) {
                                rval = this.handle_mem_load_control(rsval);
                            } else {
                                trap = 5 + 1;
                                rval = rsval;
                            }
                        }
                        else {
                            switch ((ir >>> 12) & 0x7) {
                                case 0:  // LB (load byte signed)
                                    rval = this.ram.getInt8(rsval); break;
                                case 1:  // LH (load halfword signed)
                                    rval = this.ram.getInt16(rsval, this.little_endian); break;
                                case 2:  // LW (load word)
                                    rval = this.ram.getUint32(rsval, this.little_endian); break;
                                case 4:  // LBU (load byte unsigned)
                                    rval = this.ram.getUint8(rsval); break;
                                case 5:  // LHU (load halfword unsigned)
                                    rval = this.ram.getUint16(rsval, this.little_endian); break;
                                default:
                                    trap = 2 + 1;  // Illegal instruction
                                    break;
                            }
                        }
                        break;
        
                    case 0x23:
                        rs1 = this.registers[(ir >>> 15) & 0x1f];
                        rs2 = this.registers[(ir >>> 20) & 0x1f];

                        let addy = ((ir >>> 7) & 0x1f) |
                                   ((ir & 0xfe000000) >>> 20);

                        if (addy & 0x800) {
                            addy |= 0xfffff000;
                        }
                    
                        addy = riscv_math.rv_unsigned_add(addy, riscv_math.rv_unsigned_sub(rs1, this.RAM_IMAGE_OFFSET));
                        rdid = 0;
                    
                        if (riscv_math.rv_unsigned_ge(addy, riscv_math.rv_unsigned_sub(this.RAM_SIZE, 3))) {
                            addy = riscv_math.rv_unsigned_add(addy, this.RAM_IMAGE_OFFSET);
                        
                            if (this.MMIORange(addy)) {
                                if (addy === 0x10000000) {
                                    this.write(String.fromCharCode(rs2 & 0xff));
                                }
                                else if (addy == 0x11004004) {
                                    this.timermatchh = rs2;
                                }
                                else if (addy == 0x11004000) {
                                    this.timermatchl = rs2;
                                }
                                else if (addy == 0x11100000) {
                                    this.pc = riscv_math.rv_unsigned_add(this.pc, 4);
                                    return rs2;
                                }
                            } 
                            else {
                                trap = 7 + 1;
                                rval = addy;
                            }
                        } 
                        else {
                            switch ((ir >>> 12) & 0x7) {
                                case 0:  // SB (store byte)
                                    this.ram.setUint8(addy, rs2); break;
                                case 1:  // SH (store halfword)
                                    this.ram.setUint16(addy, rs2, this.little_endian); break;
                                case 2:  // SW (store word)
                                    this.ram.setUint32(addy, rs2, this.little_endian); break;
                                default:
                                    trap = 2 + 1; break;
                            }
                        }
                        break;
        
                    case 0x13:
                    case 0x33:
                        imm = ir >>> 20;
                        imm = imm | ( ( imm & 0x800 ) ? 0xfffff000 : 0 );

                        rs1 = this.registers[(ir >>> 15) & 0x1f] >>> 0;
                        let is_reg = (ir & 0x20) != 0;
                        rs2 = (is_reg) ? this.registers[imm & 0x1f] : imm;
                        rs2 >>>= 0;

                        if (is_reg && (ir & 0x02000000)) {
                            switch ((ir >>> 12) & 0x7) {
                                case 0: // MUL
                                    rval = (rs1 * rs2); break;
                                case 1: // MULH (signed × signed)
                                    rval = riscv_math.rv_signed_mulh(rs1, rs2); break;
                                case 2: // MULHSU (signed × unsigned)
                                    rval = mixed_mulh(rs1, rs2); break;
                                case 3: // MULHU (unsigned × unsigned)
                                    rval = riscv_math.rv_unsigned_mulh(rs1, rs2); break;
                                case 4: // DIV
                                    if (rs2 == 0) {
                                        rval = -1;
                                    }
                                    else {
                                        if ((rs1 | 0) == -0x80000000 && (rs2 | 0) == -1) {
                                            rval = rs1;
                                        }
                                        else {
                                            rval = ((rs1 | 0) / (rs2 | 0)) | 0;
                                        }
                                    }
                                    break;
                                case 5: // DIVU
                                    if (rs2 == 0) {
                                        rval = (0xffffffff) >>> 0;
                                    }
                                    else {
                                        rval = (rs1 / rs2) >>> 0;
                                    }
                                    break;
                                case 6: // REM
                                    if (rs2 == 0) {
                                        rval = rs1;
                                    }
                                    else {
                                        if ((rs1 | 0) == -0x80000000 && (rs2 | 0) == -1) {
                                            rval = 0;
                                        }
                                        else {
                                            rval = ((rs1 | 0) % (rs2 | 0)) >>> 0;
                                        }
                                    }
                                    break;
                                case 7: // REMU
                                    if (rs2 == 0) {
                                        rval = rs1;
                                    }
                                    else {
                                        rval = (rs1 % rs2) >>> 0;
                                    }
                                    break;
                            }
                        } 
                        else {
                            switch ((ir >>> 12) & 0x7) {
                                case 0: // ADD/SUB
                                    rval = (is_reg && (ir & 0x40000000)) ? (rs1 - rs2) : (rs1 + rs2); break;
                                case 1: // SLL
                                    rval = rs1 << (rs2 & 0x1f); break;
                                case 2: // SLT
                                    rval = ((rs1 | 0) < (rs2 | 0)) ? 1 : 0; break;
                                case 3: // SLTU
                                    rval = (rs1 < rs2) ? 1 : 0; break;
                                case 4: // XOR
                                    rval = rs1 ^ rs2; break;
                                case 5: // SRL/SRA
                                    rval = (ir & 0x40000000) ? ((rs1 | 0) >> (rs2 & 0x1f)) : (rs1 >>> (rs2 & 0x1f)); break;
                                case 6: // OR
                                    rval = rs1 | rs2; break;
                                case 7: // AND
                                    rval = rs1 & rs2; break;
                            }
                        }
                        break;
        
                    case 0x0f:
                        rdid = 0;
                        break;
        
                    case 0x73:
                        let csrno = ir >> 20;
                        let microop = (ir >> 12) & 0x7;

                        if (microop & 3) {
                            let rs1imm = (ir >> 15) & 0x1f;
                            rs1 = this.registers[rs1imm];
                            let writeval = rs1;

                            switch (csrno) {
                                case 0x300: rval = this.mstatus; break;
                                case 0x304: rval = this.mie; break;
                                case 0xC00: rval = this.cyclel; break;
                                case 0x305: rval = this.mtvec; break;
                                case 0x340: rval = this.mscratch; break;
                                case 0x341: rval = this.mepc; break;
                                case 0x342: rval = this.mcause; break;
                                case 0x343: rval = this.mtval; break;
                                case 0x344: rval = this.mip; break;
                                case 0xf11: rval = 0xff0ff0ff; break;
                                case 0x301: rval = 0x40401101; break;
                                default: rval = this.otherscr_read(csrno); break;
                            }

                            switch(microop) {
                                case 1: writeval = rs1; break;
                                case 2: writeval = rval | rs1; break;
                                case 3: writeval = rval & ~rs1; break;
                                case 5: writeval = rs1imm; break;
                                case 6: writeval = rval | rs1imm; break;
                                case 7: writeval = rval & ~rs1imm; break;
                            }

                            switch (csrno) {
                                case 0x300: this.mstatus = writeval; break;
                                case 0x304: this.mie = writeval; break;
                                case 0x305: this.mtvec = writeval; break;
                                case 0x340: this.mscratch = writeval; break;
                                case 0x341: this.mepc = writeval; break;
                                case 0x342: this.mcause = writeval; break;
                                case 0x343: this.mtval = writeval; break;
                                case 0x344: this.mip = writeval; break;
                                default: this.otherscr_write(csrno, writeval); break;
                              }
                        }
                        else if (microop == 0x0) {
                            rdid = 0;
                            if (csrno == 0x105) {
                                this.mstatus = this.mstatus | 8;
                                this.extraflags = this.extraflags | 4;
                                this.pc = riscv_math.rv_unsigned_add(pc, 4);
                                return 1;
                            }
                            else if ((csrno & 0xff) == 0x02)  {
                                let startmstatus = this.mstatus;
                                let startextraflags = this.extraflags;
                                this.mstatus = ( ( startmstatus & 0x80 ) >>> 4 ) | ( ( startextraflags & 3 ) << 11 ) | 0x80;
                                this.extraflags = ( startextraflags & ~3 ) | ( ( startmstatus >>> 11 ) & 3 );
                                pc = riscv_math.rv_unsigned_sub(this.mepc, 4);        
                            }
                            else {
                                switch (csrno) {
                                    case 0: trap = ( this.extraflags & 3 ) ? ( 11 + 1 ) : ( 8 + 1 ); break;
                                    case 1: trap = 3 + 1; break;
                                    default: trap = 2 + 1; break;
                                }
                            }
                        }
                        else {
                            trap = (2 + 1);
                        }
                        break;
        
                    case 0x2f:
                        rs1 = this.registers[(ir >>> 15) & 0x1f];
                        rs2 = this.registers[(ir >>> 20) & 0x1f];
                        const irmid = (ir >>> 27) & 0x1f;

                        rs1 = riscv_math.rv_unsigned_sub(rs1, this.RAM_IMAGE_OFFSET);

                        if (riscv_math.rv_unsigned_ge(rs1, riscv_math.rv_unsigned_sub(this.RAM_SIZE, 3))) {
                            trap = 7 + 1;
                            rval = riscv_math.rv_unsigned_add(rs1, this.RAM_IMAGE_OFFSET);
                        } 
                        else {
                            // Load original value
                            rval = this.ram.getUint32(rs1, this.little_endian);
                            let dowrite = true;
                        
                            // Handle different AMO operations
                            switch (irmid) {
                                case 0x02: // LR.W (load-reserved)
                                    this.extraflags = (this.extraflags & 0x07) | (rs1 << 3);
                                    dowrite = false;
                                    break;
                            
                                case 0x03:  // SC.W (store-conditional)
                                    rval = ( (this.extraflags >>> 0) >> 3 != ( rs1 & 0x1fffffff ) );  // Validate that our reservation slot is OK.
								    dowrite = !rval; 
                                    break;
                            
                                case 0x01: // AMOSWAP.W
                                    break;
                            
                                case 0x00: // AMOADD.W
                                    rs2 += rval; break;
                            
                                case 0x04: // AMOXOR.W
                                    rs2 = rs2 ^ rval; break;
                            
                                case 0x0C: // AMOAND.W
                                    rs2 = rs2 & rval; break;
                            
                                case 0x08: // AMOOR.W
                                    rs2 = rs2 | rval; break;
                            
                                case 0x10: // AMOMIN.W (signed)
                                    rs2 = (rs2 < rval) ? rs2 : rval; break;
                            
                                case 0x14: // AMOMAX.W (signed)
                                    rs2 = (rs2 > rval) ? rs2 : rval; break;
                            
                                case 0x18: // AMOMINU.W (unsigned)
                                    rs2 = riscv_math.rv_unsigned_lt(rs2, rval) ? rs2 : rval; break;
                            
                                case 0x1C: // AMOMAXU.W (unsigned)
                                    rs2 = riscv_math.rv_unsigned_ge(rs2, rval) ? rs2 : rval; break;
                            
                                default:
                                    trap = 2 + 1;  // Illegal instruction
                                    dowrite = false;
                                    break;
                            }
                        
                            if (dowrite) {
                                this.ram.setUint32(rs1, rs2, this.little_endian);
                            }
                        }
                        break;
        
                    default:
                        trap = 2 + 1;
                        break;
                }
                if (trap) {
                    this.pc = pc;
                    this.postexec(pc, ir, trap);
                    break;
                }

                if (rdid) {
                    this.registers[rdid] = rval;
                }
            }

            this.postexec(pc, ir, trap);
            pc = riscv_math.rv_unsigned_add(pc, 4);
        }

        if (trap) {
            if (trap & 0x80000000) {
                this.mcause = trap;
                this.mtval = 0;
                pc = riscv_math.rv_unsigned_add(pc, 4);
            }
            else {
                this.mcause = riscv_math.rv_unsigned_sub(trap, 1);
                this.mtval = (riscv_math.rv_unsigned_lt(5, trap) && riscv_math.rv_unsigned_ge(8, trap)) ? rval : pc;
            }

            this.mepc = pc;
            this.mstatus = (((this.mstatus & 0x08) << 4) | ((this.extraflags & 3) << 11));
            pc = riscv_math.rv_unsigned_sub(this.mtvec, 4);
            this.extraflags |= 3;

            trap = 0;
            pc = riscv_math.rv_unsigned_add(pc, 4);
        }

        if (this.cyclel > cycle) {
            this.cycleh = riscv_math.rv_unsigned_add(this.cycleh, 1);
        }
        this.cyclel = cycle;
        this.pc = pc;

        return 0;
    }


    SetReadCallback(callback) {
        this.read = callback;
    }

    SetWriteCallback(callback) {
        this.write = callback;
    }

    SetKeyboardCallback(callback) {
        this.keyboardCallback = callback;
    }

    create() {
        this.pc = this.RAM_IMAGE_OFFSET;
        this.registers[11] = (this.dtb_ptr) ? (this.dtb_ptr + this.RAM_IMAGE_OFFSET) : 0x0;
        this.extraflags = 0x3;
    }

    stop() {
        this.isRunning = false;
        if (this.executionQueue) {
            cancelAnimationFrame(this.executionQueue);
            this.executionQueue = null;
        }

        this.write("\nRestarting...\n")
    }

    run() {
        if (this.isRunning) {
            return;
        }
        
        this.isRunning = true;
        const insn_per_flip  = 8192;
        
        const executeFrame = () => {
            if (!this.isRunning) return;
            
            const start = performance.now();
            let instructionsExecuted = 0;
            
            while (instructionsExecuted < this.insn_per_frame) {
                const ret = this.step(500, insn_per_flip);
                if (ret !== 0 && ret !== 1) {
                    this.stop();
                    return;
                }
                
                instructionsExecuted += insn_per_flip;
                if (performance.now() - start > 16) break;
            }
            this.executionQueue = setTimeout(executeFrame, 20);
        };
        this.executionQueue = setTimeout(executeFrame, 20);
    }
};